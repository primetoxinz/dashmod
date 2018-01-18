"use strict";
var $ = require('jquery');
var {SmoothieChart, TimeSeries} = require('smoothie');
;
var {Client} = require('wpilib-nt-client');
var ip = '127.0.0.1';
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
            var li = $("<li></li>").append(element);
            var list = $("." + this.module.key + " ul")
            list.append(li);
        }
    }

    class Header extends Entry {
        init() {
            var header = $("<h1>" + capitalize(this.data.title) + "</h1>").css({
                "background": this.data.background,
                color: this.data.color
            });
            this.module.container.prepend(header);
        }
    }

    class Camera extends Entry {
        init() {
            this.index = 0;
            var viewer = $("<div id=" + this.data.id + "></div>");
            this.module.container.css("min-width", 720);
            viewer.css({
                width: 720,
                height: 405,
                "background-size": "contain",
                "background-repeat": "no-repeat",
                "text-align": "center"
            });
            var _this = this;
            viewer.click(function (event) {
                if (event.shiftKey) {
                    _this.index = (_this.index + 1) % _this.data.srcs.length;
                    viewer.css('background-image', 'url(' + _this.data.srcs[_this.index] + ')');
                }
            });
            viewer.css('background-image', 'url(' + this.data.srcs[0] + ')');
            super.init(viewer);
        }
    }

    class Graph extends Entry {
        createGraph(canvas) {
            var graph = new SmoothieChart(this.data.format);
            var line = new TimeSeries();
            graph.streamTo(canvas.get(0), 1000);
            graph.addTimeSeries(line);
            return line;
        }

        init() {
            var w = 300,
                h = 100;
            var container = $("<div></div>");
            var canvas = $("<canvas></canvas>");
            canvas.width(w);
            canvas.height(h);
            $("<span>\t" + this.data.prefice + " : </span>").appendTo(container);
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
            var color = "#F00";
            $.each(this.data.formats, function (k, f) {
                var r = new Range(f.predicate);
                if (r.inRange(value)) {
                    color = f.color;
                }
            });
            return color;
        }

        init() {
            super.init($("<span>\t" + this.data.prefice + " : </span><span id=" + this.data.id + ">0</span>"));
        }

        update(value) {
            $("#" + this.data.id).html(value).css("color", this.setFormat(value));
        }
    }

    class StringValue extends Entry {
        init() {
            super.init($("<span>\t" + this.data.prefice + " : </span><span id=" + this.data.id + "></span>"));
        }

        update(value) {
            $("#" + this.data.id).html(value);
        }
    }

    class Selector extends Entry {
        init() {
            var main = this;
            var container = $("<div></div>");
            $("<span>\t" + this.data.prefice + " : </span>").appendTo(container);
            var select = $("<select id=" + this.data.id + "></select>");
            $.each(this.data.choices, function (k, v) {
                select.append($("<option value='" + v + "'>" + capitalize(v) + "</option>"));
            });
            select.appendTo(container);
            NetworkTables.Assign(select.val(), main.data.key);
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
            this.container = $("<div class='list " + this.key + "'></div>");
            this.container.append($("<ul></ul>"));
            this.container.appendTo(".section");
            var header = false;
            this.entries.push({
                "type": "header",
                "data": {
                    "title": this.key
                }
            });
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                if (!(e.type in entryRegistry))
                    continue;
                try {
                    var newEntry = new entryRegistry[e.type](this, e.data);
                    if (newEntry != null) {
                        try {
                            var skip = false;
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
            var name = entryClass.prototype.constructor.name.toLowerCase();
            entryRegistry[name] = entryClass.prototype.constructor;
        }

        update(key, value) {
            $.each(this.loaded, function (k, entry) {
                if (entry.data.key == key) {
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

    const loadedModules = [];

    function load(file) {
        NetworkTables.start((isConnected, err) => {
        });
        var json = $.getJSON(file);
        $(document).ready(function () {
            $.each(json.responseJSON, function (k, module) {
                loadedModules.push(new Module(k, module));
            });
        })
    }


    NetworkTables.addListener((key, val, type, id) => {
        $.each(loadedModules, function (k, v) {
            v.update(key, val);
        });
    });
    exports.Module = Module;
    exports.Entry = Entry;
    exports.load = load;
    exports.NetworkTables = NetworkTables;

})(typeof exports === 'undefined'
    ? this
    : exports);
