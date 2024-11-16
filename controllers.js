"use strict";

import { Controller } from "https://unpkg.com/@hotwired/stimulus@3.2.2/dist/stimulus.js";
import { Parser } from "./models.js";

export class DDDController extends Controller {
    // the main controller

    static get targets() { return ["input", "roll", "results"]; }

    connect() {
        this.changeInput();
    }

    changeInput() {
        let p = new Parser(this.inputTarget.value);

        try {
            this.pool = p.pool();
            this.rollTarget.value = "roll!";
            this.rollTarget.disabled = false;
        } catch (error) {
            console.log(error.message);
            this.pool = null;
            this.rollTarget.value = "error";
            this.rollTarget.disabled = true;
        }
    }

    roll() {
        let currentRoll =  this.pool.roll();
        let $container = document.createElement("div");
        $container.classList.add('result');

        $container.appendChild(currentRoll.html());

        let $sum = document.createElement("div");
        $sum.classList.add('sum');
        $sum.appendChild(document.createTextNode(`= ${currentRoll.sum()}`));
        $container.appendChild($sum);

        this.resultsTarget.insertBefore($container, this.resultsTarget.firstChild);
    }
}