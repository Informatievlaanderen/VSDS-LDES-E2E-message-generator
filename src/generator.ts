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

    public createNext(): any {
        var data = { index: this.index(), timestamp: this.timestamp() };
        var next = Mustache.render(this._template, data);
        return next;
    }
}
