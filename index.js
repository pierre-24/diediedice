"use strict";

Object.defineProperties(Array.prototype, {
    max: {
        value: function() {
            return Math.max.apply(null, this);
        }
    },
    min: {
        value: function() {
            return Math.min.apply(null, this);
        }
    }
});

class Histogram {
    constructor(values) {
        this.rawValues = values;
        this.min = this.rawValues.min();
        this.max = this.rawValues.max();
        this.n = this.rawValues.length;

        this.histogram = {};
        for (let i=this.min; i<= this.max; i++)
            this.histogram[i] = 0;

        this.rawValues.forEach((i) => {this.histogram[i] += 1; });

        this.density = {};
        Object.keys(this.histogram).forEach(k  => this.density[k] = this.histogram[k] / this.n);
    }

    roll(n=1) {
        return [...Array(n)].map(_ => this.rawValues[Math.floor(Math.random() * this.rawValues.length)]);
    }
}

class Die {
    // a simple die
    constructor(maximum){
        this.maximum = maximum;
    }

    min() {
        return 1;
    }

    max() {
        return this.maximum;
    }

    roll(n=1) {
        if (n > 1)
            return [...Array(n)].map(_ => Math.floor(Math.random()*(this.maximum)) + 1);
        else
            return Math.floor(Math.random()*(this.maximum)) + 1;
    }

    all_events() {
        return [...Array(this.maximum).keys()].map(i => i + 1);
    }

    histogram() {
        return new Histogram(this.all_events());
    }
}

class Modifier {
    // a simple modifier
    constructor(value){
        this.value = value;
    }

    min() {
        return this.value;
    }

    max() {
        return this.value;
    }

    roll(n=1) {
        if(n > 1)
            return [...Array(n)].map(_ => this.value);
        else
            return this.value;
    }

    all_events() {
        return [this.value];
    }

    histogram() {
        return new Histogram(this.all_events());
    }
}

class Pool  {
    // a pool of dice/pools
    constructor(pool) {
        this.pool = pool;
    }

    min() {
        let minimum = 0;
        this.pool.forEach((die) => {minimum += die.min(); });
        return minimum;
    }

    max() {
        let maximum = 0;
        this.pool.forEach((die) => {maximum += die.max(); });
        return maximum;
    }

    roll(n=1) {
        return [...Array(n)].map(_ => this.pool.map(die => die.roll()));
    }

    all_events() {
        let each_events = this.pool.map((die) => { return die.all_events(); });
        let events = [];

        function recurse(i, r) {
            if(i < each_events.length) {
                each_events[i].forEach((v) => { recurse(i + 1, r + v); });
            } else {
               events.push(r);
            }
        }

        recurse(0, 0);

        return events;
    }

    histogram() {
        return new Histogram(this.all_events());
    }
}

class SubPool extends Pool {
    // select `n` results out of pool, using `selector`
    constructor(pool, n, selector) {
        if(pool.length <= n)
            throw Error("Size of subpool should be lower than pool");

        super(pool);

        this.n = n;
        this.select = selector;
    }

    min() {
        let minima = this.select(this.n, this.pool.map((die) => die.min()));
        return minima.min();
    }

    max() {
        let maxima = this.select(this.n, this.pool.map((die) => die.max()));
        return maxima.max();
    }

    roll(n=1) {
        return [...Array(n)].map(_ => {
            return this.select(this.n, this.pool.map(die => die.roll()));
        });
    }

    all_events(){
        let each_events = this.pool.map((die) => { return die.all_events(); });
        let events = [];

        function recurse(i, r, select) {
            if(i < each_events.length) {
                each_events[i].forEach((v) => { recurse(i + 1, [...r, v], select); });
            } else {
                events.push(select(r).reduce((a, b) => a + b, 0));
            }
        }

        recurse(0, [], (seq) => {return this.select(this.n, seq);});

        return events;
    }
}

class BestOfPool extends SubPool {
    constructor(pool, n) {
        super(pool, n, (n, seq) => { seq.sort((a, b) => b - a); return seq.slice(0, n); });
    }
}

class WorstOfPool extends SubPool {
    constructor(pool, n) {
        super(pool, n, (n, seq) => { seq.sort((a, b) => a - b); return seq.slice(0, n); });
    }
}

let pool1 = new BestOfPool([new Die(12), new Die(12)], 1);
console.log(pool1.roll(5));