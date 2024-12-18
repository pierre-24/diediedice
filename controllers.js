"use strict";

import { Controller } from "https://unpkg.com/@hotwired/stimulus@3.2.2/dist/stimulus.js";
import { Parser } from "./models.js";

export class DDDController extends Controller {
    // the main controller

    static get targets() { return ["input", "roll", "results", "histogram", "history"]; }

    connect() {
        this.changeInput();
    }

    makeHistogram() {

        if(this.pool == null) {
            this.histogramTarget.innerHTML = '<i>Incorrect input.</i>';
        } else {
            let histogram = this.pool.histogram();
            let activeTab = 'normal';

            // find the active tab
            document.querySelectorAll('#histTabs .nav-link').forEach(child => {
                if(child.classList.contains('active'))
                    activeTab = child.id.replace('hist-', '').replace('-tab', '');
            });

            // add the 3 histograms
            this.histogramTarget.innerHTML = '';

            ['normal', 'atleast', 'atmost'].forEach(mode => {

                let $histogram = histogram.html(mode);

                let $div = document.createElement('div');
                $div.id = `hist-${mode}-tab-pane`;
                $div.classList.add('tab-pane');

                if(mode === activeTab) {
                    $div.classList.add('show', 'active');
                }

                $div.appendChild($histogram);
                this.histogramTarget.appendChild($div);
            });
        }
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
            this.rollTarget.value = "error in input";
            this.rollTarget.disabled = true;
        }

        this.makeHistogram();
    }

    setInputAndRoll(input) {
        this.inputTarget.value = input;
        this.changeInput();
        this.roll();
    }

    _makeHistory() {
        let currentInput = this.inputTarget.value.replace(' ', '');

        let $history = document.createElement("a");
        $history.classList.add('history-element');
        $history.appendChild(document.createTextNode(currentInput));
        $history.onclick = () => this.setInputAndRoll(currentInput);

        this.historyTarget.querySelectorAll('.history-element').forEach($child => {
            if($child.innerText === currentInput) {
                $history = $child;
                this.historyTarget.removeChild($child);
            }
        });

        this.historyTarget.insertBefore($history, this.historyTarget.firstChild);
    }

    roll() {
        // roll
        let currentRoll =  this.pool.roll();
        let $container = document.createElement("div");
        $container.classList.add('result');

        $container.appendChild(currentRoll.html());

        let $sum = document.createElement("div");
        $sum.classList.add('sum');
        $sum.appendChild(document.createTextNode(`= ${currentRoll.sum()}`));
        $container.appendChild($sum);

        if(this.resultsTarget.children.length > 10){ // remove if list is > 10
            this.resultsTarget.removeChild(this.resultsTarget.lastChild);
        }

        this.resultsTarget.insertBefore($container, this.resultsTarget.firstChild);

        this._makeHistory();
    }
}