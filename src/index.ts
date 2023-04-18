import { CronJob } from 'cron';
import { existsSync, readFileSync } from 'fs';
import minimist from 'minimist';
import { Generator } from './generator.js';
import fetch from 'node-fetch';

const args = minimist(process.argv.slice(2));
const silent: boolean = (/true/i).test(args['silent']);
if (!silent) console.debug("Arguments: ", args);

const cron = args['cron'] || '* * * * * *';
const mimeType = args['mimeType'];
let template: string = args['template'] || (args['templateFile'] && readFileSync(args['templateFile'], {encoding: 'utf8'}));
if (!template) throw new Error('Missing template or templateFile');

const generator: Generator = new Generator(template);

const job = new CronJob(cron, async () => {
    const body = generator.createNext();
    const targetUrl = args['targetUrl'] || (existsSync('./TARGETURL') && readFileSync('./TARGETURL', 'utf-8').trimEnd());
    if (targetUrl) {
        if (!mimeType) throw new Error('Missing mimeType');
        if (!silent) console.debug(`Sending to '${targetUrl}':`, body);
        const response = await fetch(targetUrl, {
            method: 'post',
            body: body,
            headers: {'Content-Type': mimeType}
        });
        if (!silent) console.debug(`Response: ${response.statusText}`);
    } else { // if no targetUrl specified, send to console
        console.info(body);
    }
    if (!silent) console.debug('Next run at: ', job.nextDate().toString());
});

if (!silent) console.debug('Runs at: ', cron);
job.start();
