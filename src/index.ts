import { CronJob } from 'cron';
import { existsSync, readFileSync } from 'fs';
import minimist from 'minimist';
import { Generator } from './generator.js';
import fetch from 'node-fetch';

const args = minimist(process.argv.slice(2));
const silent: boolean = (/true/i).test(args['silent']);
if (!silent) console.warn("Arguments: ", args);

const cron = args['cron'] || '* * * * * *';
const mimeType = args['mimeType'];
const maxRetries = Number.parseInt(args['maxRetries'] || '5');
const retryTimeout = Number.parseInt(args['retryTimeout'] || '10');
let template: string = args['template'] || (args['templateFile'] && readFileSync(args['templateFile'], {encoding: 'utf8'}));
if (!template) throw new Error('Missing template or templateFile');

const generator: Generator = new Generator(template);
const range = Number.parseInt(args['range'] || '0');
const nonFatalHttpCodes : number[] = [429, 500, 503];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let messageCount = 0;

const job = new CronJob(cron, async () => {
    const timestamp = new Date().toISOString();
    const messages = range ? generator.createRange(range) : [generator.createNext()];
    const targetUrl = args['targetUrl'] || (existsSync('./TARGETURL') && readFileSync('./TARGETURL', 'utf-8').trimEnd());
    if (targetUrl && !mimeType) throw new Error('Missing mimeType');

    const startTime = new Date().valueOf();
    for await (const body of messages) {
        messageCount++;

        if (targetUrl) {
            let retry = false;
            let retries = 0;
            do {
                try {
                    if (retry) {
                        const msg = `Retrying (${retries} of ${maxRetries}) send message ${messageCount} to ${targetUrl}`;
                        console.warn(msg);
                    }

                    const response = await fetch(targetUrl, {
                        method: 'post',
                        body: body,
                        headers: {'Content-Type': mimeType}
                    });
                    
                    retry = nonFatalHttpCodes.includes(response.status);
                } catch (error) {
                    const msg = error instanceof Error ? `${error.name}: ${error.message}, reason: ${error.cause}` : String(error);
                    console.error(`ERROR: cannot POST to ${targetUrl} because: ${msg}`);
                    retry = true;
                }
            } while (retry && (++retries <= maxRetries) && (await sleep(retryTimeout), true));
        } else { // if no targetUrl specified, send to console
            console.info(body);
        }
    };

    if (!silent) {
        const endTime = new Date().valueOf();
        const deltaMillis = endTime - startTime;
        const msg = `[${timestamp}] sent ${messages.length} messages to ${targetUrl} in ${deltaMillis} milliseconds.`;
        console.warn(msg);
    }
});

if (!silent) console.warn('Runs at: ', cron);
job.start();
