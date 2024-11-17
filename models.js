"use strict";

Object.defineProperties(Array.prototype, {
    max: {
        value: function() {
            return this.reduce((a, b) => Math.max(a, b), -Infinity);
        }
    },
    min: {
        value: function() {
            return this.reduce((a, b) => Math.min(a, b), Infinity);
        }
    }
});

export class Histogram {
    // a histogram for integer values up to `this.max`.

    constructor(values) {
        this.histogram = values;

        this.min = this.histogram.keys().reduce((a, b) => {
            if(this.histogram[a] === 0 && this.histogram[b] === 0)
                return this.histogram.length;
            else if(this.histogram[a] === 0) {
                return b;
            } else if(this.histogram[b] === 0) {
                return a;
            } else {
                return (a < b) ? a : b;
            }
        }, this.histogram.length);

        this.max = this.histogram.keys().reduce((a, b) => {
            if(this.histogram[a] === 0 && this.histogram[b] === 0)
                return 0;
            else if(this.histogram[a] === 0) {
                return b;
            } else if(this.histogram[b] === 0) {
                return a;
            } else {
                return (a < b) ? b : a;
            }
        }, 0);

        this.n = this.histogram.keys().reduce((a, b) => a + this.histogram[b], 0);

        this.mean = this.histogram.keys().reduce((a, b) => a + b * this.histogram[b], 0) / this.n;
        this.variance = this.histogram.keys().reduce((a , b) => a + this.histogram[b] * Math.pow(b - this.mean, 2), 0) / this.n;
        this.std = Math.sqrt(this.variance);

        console.log(`histogram: µ=${this.mean}, std=${this.std}`);

        this.density = {};
        Object.keys(this.histogram).forEach(k  => this.density[k] = this.histogram[k] / this.n);

        this.cumulativeDensity = {};
        Object.keys(this.density).forEach(k  => this.cumulativeDensity[k] = this.density[k] + (parseInt(k) === this.min ? 0 : this.cumulativeDensity[k-1]));
    }

    roll(n=1) {
        return [...Array(n)].map(_ => this.histogram[Math.floor(Math.random() * this.histogram.length)]);
    }

    html(mode='normal') {
        let $table = document.createElement("table");

        Object.keys(this.histogram).forEach(k => {
            if(k >= this.min) {
                let $row = document.createElement("tr");
                $row.classList.add('histogram-row');

                let percentage = this.density[k] * 100;
                if (mode === 'atleast') {
                    percentage = (1 - this.cumulativeDensity[k] + this.cumulativeDensity[this.min]) * 100;
                } else if (mode === 'atmost') {
                    percentage = this.cumulativeDensity[k] * 100;
                }

                $row.innerHTML = `<td>${k}</td><td width="90%"><div class="bar"><div class="cbar" style="width: ${percentage}%"></div></div></td><td><span class="text-muted">${percentage.toFixed(1)}%</span></td>`;

                $table.appendChild($row);
            }
        });

        let $div = document.createElement('div');
        if(mode === 'normal') {
            let $p = document.createElement('p');
            $p.classList.add('histogram-summary');
            $p.appendChild(document.createTextNode(`µ = ${this.mean.toFixed(1)}, 95% interval = [${Math.max(this.mean - 2 * this.std, this.min).toFixed(1)}, ${Math.min(this.mean + 2 * this.std, this.max).toFixed(1)}].`));
            $div.appendChild($p);
        }

        $div.appendChild($table);

        return $div;
    }
}

export class DieResult {
    // The result of a roll

    constructor(value, die) {
        this.value = value;
        this.die = die;
    }

    sum() {
        return this.value;
    }

    repr() {
        return `${this.die.repr()}=${this.value}`;
    }

    html() {
        return this.die.html(this.value);
    }
}

export class DiceResult {
    constructor(rolls, pool) {
        this.rolls = rolls;
        this.pool = pool;
    }

    sum() {
        return this.rolls.reduce((sum, roll) => { return sum + roll.sum(); }, 0);
    }

    repr() {
        return '{' + this.rolls.map(roll => roll.repr()).join(' + ') + '}';
    }

    html() {
        let $container = this.pool.html();
        this.rolls.forEach((roll) => { $container.appendChild(roll.html()); });
        return $container;
    }

}

export class Die {
    // a simple die

    constructor(maximum){
        this.maximum = maximum;
    }

    min() {
        // minimum value that the die can roll

        return 1;
    }

    max() {
        // maximum value that the die can roll

        return this.maximum;
    }

    roll() {
        // roll the die, result is in [min,max]

        return new DieResult(Math.floor(Math.random()*(this.maximum)) + 1, this);
    }

    all_events() {
        // get all possible value

        return [...Array(this.maximum + 1).keys()].map(i => i > 0 ? 1 : 0);
    }

    histogram() {
        // get the histogram corresponding to all events

        return new Histogram(this.all_events());
    }

    repr() {
        // get the representation, for debugging purpose

        return `d${this.maximum}`;
    }

    html(result=1) {
        let $die = document.createElement("div");

        $die.classList.add('die');
        $die.classList.add(`d${this.maximum}`);

        let $span = document.createElement('span');
        $span.appendChild(document.createTextNode(`${result}`));

        $die.appendChild($span);

        return $die;
    }
}

export class ExplodingDie extends Die {
    // an exploding die

    constructor(maximum, maxExplosion=3){
        super(maximum);
        this.maxExplosion = maxExplosion;
    }

    max() {
        return this.maxExplosion * this.maximum;
    }

    roll() {
        function r(m, n) {
            let rf = 0;
            for (let i=0; i < n; i++) {
                let ri = Math.floor(Math.random() * (m)) + 1;
                rf += ri;
                if(ri !== m)
                    break;
            }

            return  rf;
        }

        return new DieResult(r(this.maximum, this.maxExplosion), this);
    }

    all_events() {
        return [...Array(this.maximum * this.maxExplosion + 1).keys()].map(i => {
            if(i % this.maximum === 0 && i !== this.maximum * this.maxExplosion)
                return 0;
            else if(i === this.maximum * this.maxExplosion)
                return 1;
            else {
                let nExplosion = Math.floor(i / this.maximum);
                return Math.pow(this.maximum, this.maxExplosion - nExplosion - 1);
            }
        });
    }

    repr() {
        return `d${this.maximum}!${this.maxExplosion}`;
    }

    html(result = 1) {
        let $die = super.html(result);
        let $explosion = document.createElement("span");
        $explosion.classList.add('badge');
        $explosion.appendChild(document.createTextNode(`${this.maxExplosion}!`));
        $die.appendChild($explosion);
        return $die;
    }
}

export class Modifier {
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

    roll() {
        return new DieResult(this.value, this);
    }

    all_events() {
        return [...Array(this.value + 1).keys()].map(i => i === this.value ? 1 : 0);
    }

    histogram() {
        return new Histogram(this.all_events());
    }

    repr() {
        return `${this.value}`;
    }

    html(result=1) {
        let $die = document.createElement("div");

        $die.classList.add('die');
        $die.classList.add('modifier');

        $die.appendChild(document.createTextNode(`${result}`));

        return $die;
    }
}

export class Pool  {
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

    roll() {
        return new DiceResult(this.pool.map(die => die.roll()), this);
    }

    rolls(n=1) {
        return [...Array(n)].map(_ => this.roll());
    }

    all_events() {
        let each_events = this.pool.map((die) => { return die.all_events(); });
        let events = [...Array(this.max() + 1).keys()].map(_ => 0);

        each_events.keys().forEach(i => {
            let prev_events = [...events];
            events = [...Array(this.max() + 1).keys()].map(_ => 0);
            if(i === 0) {
                each_events[0].keys().forEach(k => events[k] = each_events[0][k]);
            } else {
                each_events[i].keys().forEach(k2 => {
                    if(each_events[i][k2] > 0)
                        prev_events.keys().forEach(k1 =>  {
                            if(prev_events[k1] > 0)
                                events[k1 + k2] += each_events[i][k2] * prev_events[k1];
                        });
                });
            }
        });

        return events;
    }

    histogram() {
        return new Histogram(this.all_events());
    }

    repr() {
        return this.pool.map(die => die.repr()).join('+');
    }

    html() {
        let $container = document.createElement("div");
        $container.classList.add('pool');
        return $container;
    }
}

export class SubPoolSizeError extends Error {
    constructor() {
        super("Size of subpool should be lower than of pool");
    }
}

export class SubPool extends Pool {
    // select `n` results out of pool, using `selector`

    constructor(pool, n, select_rolls, select_events) {
        if(pool.length <= n)
            throw new SubPoolSizeError();

        super(pool);

        this.n = n;
        this.select_rolls = select_rolls;
        this.select_events = select_events;
    }

    min() {
        let minima = this.select_rolls(this.n, this.pool.map((die) => new DieResult(die.min(), die)));
        return new DiceResult(minima, this).sum();
    }

    max() {
        let maxima = this.select_rolls(this.n, this.pool.map((die) => new DieResult(die.max(), die)));
        return new DiceResult(maxima, this).sum();
    }

    roll() {
        let roll = this.pool.map(die => die.roll());
        return new DiceResult(this.select_rolls(this.n, roll), this);
    }

    all_events(){
        let events = [...Array(this.max() + 1).keys()].map(i => 0);

        let N = this.pool.map((die) => die.max()).reduce((a, b) => a * b, 1);

        if(N < 10000) {
            let each_events = this.pool.map((die) => {
                return die.all_events();
            });

            function recurse(i, rx, select) {
                if (i < each_events.length) {
                    each_events[i].keys().forEach((k) => {
                        if (each_events[i][k] > 0) recurse(i + 1, [...rx, [k, each_events[i][k]]], select);
                    });
                } else {
                    let selected = select(rx);
                    events[selected.reduce((a, b) => a + b[0], 0)] += selected.reduce((a, b) => a * b[1], 1);
                }
            }

            recurse(0, [], (seq) => {
                return this.select_events(this.n, seq);
            });
        } else {
            console.log(`N=${N}, use a statistical approach`);

            for(let i = 0; i < 10000; i++) {
                let roll = this.roll();
                events[roll.sum()] += 1;
            }
        }

        return events;
    }

    repr(f='?') {
        return `${f}${this.n}o(${super.repr()})`;
    }

    html(f='?') {
        let $container = super.html();

        let $explosion = document.createElement("span");
        $explosion.classList.add('badge');
        $explosion.appendChild(document.createTextNode(f));

        $container.classList.add('subpool');
        $container.appendChild($explosion);

        return $container;
    }
}

export class BestOfPool extends SubPool {
    constructor(pool, n) {
        super(
            pool,
            n,
            (n, seq) => { seq.sort((a, b) => b.sum() - a.sum()); return seq.slice(0, n); },
            (n, seq) => { seq.sort((a, b) => b[0] - a[0]); return seq.slice(0, n); }
        );
    }

    repr() {
        return super.repr('b');
    }

    html() {
        return super.html('b');
    }
}

export class WorstOfPool extends SubPool {
    constructor(pool, n) {
        super(
            pool,
            n,
            (n, seq) => { seq.sort((a, b) => a.sum() - b.sum()); return seq.slice(0, n); },
            (n, seq) => { seq.sort((a, b) => a[0] - b[0]); return seq.slice(0, n); }
        );
    }

    repr() {
        return super.repr('w');
    }

    html() {
        return super.html('w');
    }
}

const TokenTypes = {
    CHAR: 'CHR',
    LPAR: '(',
    RPAR: ')',
    PLUS: '+',
    INT: 'INT',
    COMMENT: ';',
    EOS: 'EOS'
};

export class Token {
    constructor(type, value, pos=-1) {
        this.type = type;
        this.value = value;
        this.position = pos;
    }

    repr() {
        return `Token(${this.type}, ${this.value}, ${this.position})`;
    }
}

export class ParseError extends Error {
    constructor(token, what) {
        super(what + ` @ ${token.repr()}`);
        this.what = what;
        this.token = token;
    }
}

export class Parser {
    constructor(input) {
        this.input = input;
        this.pos = -1;
        this.currentToken = null;

        this.next();
    }

    _parseChar(char) {
        // parse a character into a number

        if(!isNaN(char)) {
           return new Token(TokenTypes.INT, parseInt(char), this.pos);
        } else if (char === '(') {
            return new Token(TokenTypes.LPAR, char, this.pos);
        } else if (char === ')') {
            return new Token(TokenTypes.RPAR, char, this.pos);
        } else if (char === '+') {
            return new Token(TokenTypes.PLUS, char, this.pos);
        } else if (char === ';') {
            return new Token(TokenTypes.COMMENT, char, this.pos);
        }else {
            return new Token(TokenTypes.CHAR, char, this.pos);
        }
    }

    next() {
        // go to next token

        this.pos += 1;
        while (this.pos < this.input.length && this.input[this.pos] === ' ') // skip spaces
            this.pos += 1;

        if (this.pos < this.input.length) {
            let char = this.input[this.pos];
            this.currentToken = this._parseChar(char);
        } else {
            this.currentToken = new Token(TokenTypes.EOS, '\\0', this.pos);
        }
    }

    number() {
        // NUMBER := INT*

        if(this.currentToken.type !== TokenTypes.INT)
            throw new ParseError(this.currentToken, `expected INT`);

        let number = 0;
        while(this.currentToken.type === TokenTypes.INT) {
            number = number * 10 + this.currentToken.value;
            this.next();
        }

        return number;
    }

    pool() {
        // POOL := (DIE | SUBPOOL) ('+' POOL)?

        let pool = [];

        if (this.currentToken.value === 'd' || this.currentToken.type === TokenTypes.INT) {
            pool.push(...this.dice());
        } else {
            pool.push(this.subpool());
        }

        let right = null;

        if (this.currentToken.type === TokenTypes.PLUS) {
            this.next();
            right = this.pool();
            pool.push(...right.pool);
        } else if(this.currentToken.type !== TokenTypes.EOS && this.currentToken.type !== TokenTypes.COMMENT && this.currentToken.type !== TokenTypes.RPAR)
            throw new ParseError(this.currentToken, `expected EOS, COMMENT, RPAR, or PLUS`);

        return new Pool(pool);
    }

    subpool() {
        // SUBPOOL := ('b' | 'w') NUMBER? 'o' LPAR POOL RPAR

        if (this.currentToken.value !== 'b' && this.currentToken.value !== 'w')
            throw new ParseError(this.currentToken, `expected 'b' or 'w'`);

        let type = this.currentToken.value;
        this.next();

        let n = 1;
        if (this.currentToken.type === TokenTypes.INT)
            n = this.number();

        if (this.currentToken.value !== 'o')
            throw new ParseError(this.currentToken, `expected 'o'`);

        this.next();

        if (this.currentToken.type !== TokenTypes.LPAR)
            throw new ParseError(this.currentToken, `expected LPAR`);

        this.next();

        let pool = this.pool();

        if (this.currentToken.type !== TokenTypes.RPAR)
            throw new ParseError(this.currentToken, `expected RPAR`);

        this.next();

        try {
            if(type === 'b') {
                return new BestOfPool(pool.pool, n);
            } else if(type === 'w') {
                return new WorstOfPool(pool.pool, n);
            }
        } catch (error) {
            throw new ParseError(this.currentToken, `while instancing subpool got "${error.message}"`);
        }

    }

    dice() {
        // DICE := NUMBER? ('d' NUMBER ('!' NUMBER?)?)?

        let n = 1;
        if (this.currentToken.type === TokenTypes.INT)
            n = this.number();

        if(this.currentToken.value === 'd') {
            this.next();

            let q = this.number();
            let maxExplosion = 3;
            let isExploding = false;

            if (this.currentToken.value === '!') {
                isExploding = true;
                this.next();

                if (this.currentToken.type === TokenTypes.INT)
                    maxExplosion = this.number();
            }

            let dice = [];
            for (let i = 0; i < n; i++) {
                if (isExploding) {
                    dice.push(new ExplodingDie(q, maxExplosion));
                } else {
                    dice.push(new Die(q));
                }
            }

            return dice;
        } else {
            return [new Modifier(n)];
        }
    }
}