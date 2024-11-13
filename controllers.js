"use strict";

import { Controller } from "https://unpkg.com/@hotwired/stimulus@3.2.2/dist/stimulus.js";
import { Parser, sumOfRolls } from "./models.js";

export class DDDController extends Controller {
    // the main controller

    static get targets() { return ["input", "roll"]; }

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
            this.rollTarget.value = "error";
            this.rollTarget.disabled = true;
        }
    }

    roll() {
        let currentRoll =  this.pool.roll();
        console.log("rolling...", currentRoll, sumOfRolls(currentRoll));
    }
}