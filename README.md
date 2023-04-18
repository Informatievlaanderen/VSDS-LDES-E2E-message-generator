# Test Message Generator
This small tool helps to generate (test) messages based on a [Mustache](https://mustache.github.io/) template. It can act as a simple replacement for message source systems and allows to send on regular time intervals some data, based on a template that gets altered before sending.

## Docker
The generator can be run as a Docker container, after creating a Docker image for it. The Docker container will keep running until stopped.

To create a Docker image, run the following command:
```bash
docker build --tag vsds/test-message-generator .
```

To run the generator, you can use:
```bash
docker run -v $(pwd)/data:/tmp/data -e TEMPLATEFILE=/tmp/data/template.json vsds/test-message-generator
```
You can also pass the following arguments when running the container:
* `SILENT=true` to display no logging to the console
* `TARGETURL=<target-uri>` to POST the output to the target URI instead of to the console
* `MIMETYPE=<mime-type>` to specify a mime-type when POSTing

Alternatively, you can also pass the template as string instead of as file, use `TEMPLATE`.

## Build the Generator
The generator is implemented as a [Node.js](https://nodejs.org/en/) application.
You need to run the following commands to build it:
```bash
npm i
npm run build
```

## Run the Generator
The generator works based on a template, defining the structure to use for each generated item. It can send the generated data to a target URL or simply send it to the console.

The generator takes the following command line arguments:
* `--silent=<true|false>` prevents any console debug output if true, defaults to false (not silent, logging all debug info)
* `--targetUrl` defines the target URL to where the generated message is POST'ed as the configured mime-type, no default (if not provided, sends output to console independant of `--silent`)
> **Note**: alternatively, you can provide the target URL as a plain text in a file named `TARGETURL` (located in the current working directory) allowing to change the target URL at runtime as the file is read at cron schedule time (see below), e.g.:
> ```bash
> echo http://example.org/my-ingest-endpoint > ./TARGETURL
> ```

> **Note**: for testing the target URL you can use a [webhook service](https://webhook.site/), e.g. using command line arguments `--targetUrl=https://webhook.site/f140204a-9514-4bfa-8d3e-fd18ba325ee3` or using the `TARGETURL` file:
> ```bash
> echo https://webhook.site/f140204a-9514-4bfa-8d3e-fd18ba325ee3 > ./TARGETURL
> ```
* `--mimeType=<mime-type>` mime-type of message send to target URL, no default
* `--cron` defines the time schedule, defaults to `* * * * * * ` (every second)
* `--template='<content>'` allows to provide the template on the command line, no default (if not provided, you MUST provide `--templateFile`)
* `--templateFile=<partial-or-full-pathname>` allows to provide the template in a file, no default (if not provided, you MUST provide `--template`)

The template or template file should simply contain a message with mustache variables (between `{{` and `}}`). E.g.:
```json
[
    { "id": "my-id-{{index}}", "type": "Something", "modifiedAt": "{{timestamp}}" },
    { "id": "my-other-id-{{index}}", "type": "SomethingElse", "modifiedAt": "{{timestamp}}" }
]
```

Currently the only allowed variables are:
* `index`: increasing integer value, starting from 1
* `timestamp`: current date and time formatted as [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) in UTC (e.g. `2007-04-05T14:30:00.000Z`)

You can run the generator after building it, e.g.:

Using this [template](./data/template.json) and with silent output to console:
```bash
node ./dist/index.js --templateFile ./data/template.json --silent
```
This results in something like the following:
```
{"id":"my-id-1","type":"Something","modifiedAt":"2022-09-12T13:15:42.009Z"}
{"id":"my-id-2","type":"Something","modifiedAt":"2022-09-12T13:15:43.003Z"}
{"id":"my-id-3","type":"Something","modifiedAt":"2022-09-12T13:15:44.003Z"}
...
```

By specifying the template (containing multiple objects) and mapping on the command file:
```bash
node ./dist/index.js --template '[{"id": "my-id-{{index}}", "type": "Something", "modifiedAt": "{{timestamp}}" },{ "id": "my-other-id-{{index}}", "type": "SomethingElse", "modifiedAt": "{{timestamp}}" }]' --silent
```
This results in something like:
```json
[{"id":"my-id-1","type":"Something","modifiedAt":"2022-09-12T13:44:12.010Z"},{"id":"my-other-id-2","type":"SomethingElse","modifiedAt":"2022-09-12T13:44:12.010Z"}]
[{"id":"my-id-3","type":"Something","modifiedAt":"2022-09-12T13:44:13.005Z"},{"id":"my-other-id-4","type":"SomethingElse","modifiedAt":"2022-09-12T13:44:13.005Z"}]
[{"id":"my-id-5","type":"Something","modifiedAt":"2022-09-12T13:44:14.004Z"},{"id":"my-other-id-6","type":"SomethingElse","modifiedAt":"2022-09-12T13:44:14.004Z"}]
...
```

Alternatively you can generate the output using a different time schedule (e.g. every 2 seconds) to a [dummy HTTP server](https://docs.webhook.site/) (including debugging to the console):
```bash
node ./dist/index.js --templateFile ./data/template.json --cron '*/2 * * * * *' --targetUrl https://webhook.site/ce3065f5-2f0b-49d8-8856-330ae3c6e737 --mimeType application/json
```
This results in:
```
Arguments:  {
  _: [],
  templateFile: './data/template.json',
  cron: '*/2 * * * * *',
  targetUrl: 'https://webhook.site/ce3065f5-2f0b-49d8-8856-330ae3c6e737'
}
Runs at:  */2 * * * * *
Sending to 'https://webhook.site/ce3065f5-2f0b-49d8-8856-330ae3c6e737': {"id":"my-id-1","type":"Something","modifiedAt":"2023-04-06T08:34:56.005Z"}
Response: OK
Next run at:  2023-04-06T10:34:58.000+02:00
Sending to 'https://webhook.site/ce3065f5-2f0b-49d8-8856-330ae3c6e737': {"id":"my-id-2","type":"Something","modifiedAt":"2023-04-06T08:34:58.003Z"}
Response: OK
Next run at:  2023-04-06T10:35:00.000+02:00
...
```
