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

export class Histogram {
    // a histogram for integer values, contains bins for `this.min` to `this.max`.

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

        this.cumulativeDensity = {};
        Object.keys(this.density).forEach(k  => this.cumulativeDensity[k] = this.density[k] + (parseInt(k) === this.min ? 0 : this.cumulativeDensity[k-1]));
    }

    roll(n=1) {
        return [...Array(n)].map(_ => this.rawValues[Math.floor(Math.random() * this.rawValues.length)]);
    }

    html(mode='normal') {
        let $histogram = document.createElement("table");

        Object.keys(this.histogram).forEach(k => {
            let $row = document.createElement("tr");
            $row.classList.add('histogram-row');

            let percentage = this.density[k] * 100;
            if (mode === 'atleast') {
                percentage = (1 - this.cumulativeDensity[k] + this.cumulativeDensity[this.min]) * 100;
            } else if (mode === 'atmost') {
                percentage = this.cumulativeDensity[k] * 100;
            }

            $row.innerHTML = `<td>${k}</td><td width="90%"><div class="bar"><div class="cbar" style="width: ${ percentage }%"></div></div></td><td><span class="text-muted">${percentage.toFixed(1)}%</span></td>`;

            $histogram.appendChild($row);
        });

        return $histogram;
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

        return [...Array(this.maximum).keys()].map(i => i + 1);
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
        let events = [];

        function recurse(i, m, r) {
            if(i > 0) {
                [...Array(m).keys()].map(j => j + 1).forEach((v) => {
                    if(v === m) {
                        recurse(i - 1, m, r + v);
                    } else {
                        [...Array(Math.pow(m, i - 1))].map(_ => events.push(r + v)); // this event his `i-1`-fold more probable
                    }
                });
            } else {
                events.push(r);
            }
        }

        recurse(this.maxExplosion, this.maximum, 0);

        return events;
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
        return [this.value];
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

    constructor(pool, n, selector) {
        if(pool.length <= n)
            throw new SubPoolSizeError();

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

    roll() {
        return new DiceResult(this.select(this.n, this.pool.map(die => die.roll())), this);
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
        super(pool, n, (n, seq) => {
            seq.sort((a, b) => (b instanceof DieResult || b instanceof DiceResult) ? (b.sum() - a.sum()) : (b - a));
            return seq.slice(0, n);
        });
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
        super(pool, n, (n, seq) => {
            seq.sort((a, b) => (b instanceof DieResult || b instanceof DiceResult) ? (a.sum() - b.sum()) : (a - b));
            return seq.slice(0, n);
        });
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
        } else {
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
        } else if(this.currentToken.type !== TokenTypes.EOS && this.currentToken.type !== TokenTypes.RPAR)
            throw new ParseError(this.currentToken, `expected EOS, RPAR, or PLUS`);

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