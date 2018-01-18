"use strict";
var $ = require('jquery');
var {SmoothieChart, TimeSeries} = require('smoothie');
;
var {Client} = require('wpilib-nt-client');

(function (exports) {
    const NetworkTables = new Client();

    function capitalize(string) {
        return string.toLowerCase().replace(/(?:^|\s)\S/g, function (a) {
            return a.toUpperCase();
        });
    }

    class Entry {
        constructor(module, data) {
            this.module = module;
            this.data = data;
        }

        create(module, data) {
            return new Entry(module, data);
        }

        update(value) {
        }

        init(element) {
            const li = $("<li></li>").append(element);
            const list = $(`.${this.module.key} ul`);
            list.append(li);
        }
    }

    class Header extends Entry {
        init() {
            var header = $(`<h1>${capitalize(this.data.title)}</h1>`).css({
                "background": this.data.background,
                color: this.data.color
            });
            this.module.container.prepend(header);
        }
    }

    class Camera extends Entry {
        init() {
            this.index = 0;
            const viewer = $(`<div id=${this.data.id}></div>`);
            this.module.container.css("min-width", 720);
            viewer.css({
                width: 720,
                height: 405,
                "background-size": "contain",
                "background-repeat": "no-repeat",
                "text-align": "center"
            });
            const _this = this;
            viewer.click(function (event) {
                if (event.shiftKey) {
                    _this.index = (_this.index + 1) % _this.data.srcs.length;
                    viewer.css('background-image', `url(${_this.data.srcs[_this.index]})`);
                }
            });
            viewer.css('background-image', `url(${this.data.srcs[0]})`);
            super.init(viewer);
        }
    }

    class Graph extends Entry {
        createGraph(canvas) {
            let graph = new SmoothieChart(this.data.format);
            let line = new TimeSeries();
            graph.streamTo(canvas.get(0), 1000);
            graph.addTimeSeries(line);
            return line;
        }

        init() {
            const w = 300,
                h = 100;
            const container = $("<div></div>");
            const canvas = $("<canvas></canvas>");

            canvas.width(w);
            canvas.height(h);
            $(`<span>\t${this.data.prefice} : </span>`).appendTo(container);
            canvas.appendTo(container);
            super.init(container);
            if (this.data.format == null)
                this.data.format = {
                    interpolation: 'linear',
                    minValue: 0
                };
            this.graph = this.createGraph(canvas);
        }

        update(value) {
            this.graph.append(new Date().getTime(), value);
        }
    }

    class NumberValue extends Entry {
        setFormat(value) {
            let color = "#F00";
            $.each(this.data.formats, function (k, f) {
                const r = new Range(f.predicate);
                if (r.inRange(value)) {
                    color = f.color;
                }
            });
            return color;
        }

        init() {
            super.init($(`<span>\t${this.data.prefice} : </span><span id=${this.data.id}>0</span>`));
        }

        update(value) {
            $(`#${this.data.id}`).html(value).css("color", this.setFormat(value));
        }
    }

    class StringValue extends Entry {
        init() {
            super.init($(`<span>\t${this.data.prefice} : </span><span id=${this.data.id}></span>`));
        }

        update(value) {
            $(`#${this.data.id}`).html(value);
        }
    }

    class Selector extends Entry {
        init() {
            const main = this;
            const container = $("<div></div>");
            $(`<span>\t${this.data.prefice}:</span>`).appendTo(container);
            const select = $(`<select id=${this.data.id}></select>`);
            $.each(this.data.choices, function (k, v) {
                select.append($(`<option value='${v}'>${capitalize(v)}</option>`));
            });
            select.appendTo(container);

            select.on('change', function () {
                NetworkTables.Assign($(this).val(), main.data.key);
            });
            super.init(container);
        }
    }

    class Range {
        constructor(json) {
            this.min = json.min;
            this.max = json.max;
        }

        inRange(val) {
            return val >= this.min && val <= this.max;
        }
    }

    class Module {
        constructor(key, entries) {
            this.key = key;
            this.entries = entries;
            this.loaded = [];
            this.container = $(`<div class='list ${this.key}'></div>`);
            this.container.append($("<ul></ul>"));
            this.container.appendTo(".section");
            let header = false;
            this.entries.push({
                "type": "header",
                "data": {
                    "title": this.key
                }
            });
            for (let i = 0; i < entries.length; i++) {

                const e = entries[i];
                if (!(e.type in entryRegistry))
                    continue;
                try {
                    const newEntry = new entryRegistry[e.type](this, e.data);
                    if (newEntry != null) {
                        try {
                            let skip = false;
                            if (newEntry instanceof Header) {
                                if (header)
                                    skip = true;
                                header = true;
                            }
                            if (!skip) {
                                newEntry.init();
                                this.loaded.push(newEntry);
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    }
                } catch (e) {
                    console.error(e.type, e);
                }
            }
        }

        static registerEntryType(entryClass) {
            const name = entryClass.prototype.constructor.name.toLowerCase();
            entryRegistry[name] = entryClass.prototype.constructor;
        }

        update(key, value) {
            $.each(this.loaded, function (k, entry) {
                if (entry.data.key === key) {
                    entry.update(value);
                }
            });
        }
    }

    var entryRegistry = {}

    function createDefaultRegistry(entryClasses) {
        $.each(entryClasses, function (k, clazz) {
            Module.registerEntryType(clazz);
        });
    }

    createDefaultRegistry([
        Header,
        Camera,
        Selector,
        Graph,
        NumberValue,
        StringValue
    ]);


    NetworkTables.addListener((key, val, type, id) => {
        $.each(loadedModules, function (k, v) {
            v.update(key, val);
        });
    });

    const loadedModules = [];

    function load(file) {
        const json = $.getJSON(file);
        $(document).ready(function () {
            $.each(json.responseJSON, function (k, module) {
                loadedModules.push(new Module(k, module));
            });
        });
        NetworkTables.start((isConnected, err) => {
            console.log({con, err});
            if (!con)
                throw err;
        });
    }


    exports.Module = Module;
    exports.Entry = Entry;
    exports.load = load;
    exports.NetworkTables = NetworkTables;

})(typeof exports === 'undefined'
    ? this
    : exports);
