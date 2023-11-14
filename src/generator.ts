import Mustache from 'mustache';

export class Generator {
    private _counter: number = 0;

    constructor(private _template: string) {}

    public index(): Number {
        return ++this._counter;
    }

    public timestamp(): string {
        return new Date().toISOString();
    }

    public createNext(): string {
        var data = { index: this.index(), timestamp: this.timestamp() };
        var next = Mustache.render(this._template, data);
        return next;
    }

    public createRange(range: number): string[] {
        var timestamp = this.timestamp();
        return Array.from(Array(range).keys()).map(index => Mustache.render(this._template, { index: index + 1, timestamp: timestamp }));
    }
}
