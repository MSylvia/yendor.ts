/// <reference path="../yendor/yendor.ts" />
/// <reference path="../umbra/umbra.ts" />
/// <reference path="../gizmo/gizmo.ts" />
/// <reference path="base.ts" />
/// <reference path="persistence.ts" />
/// <reference path="custom_events.ts" />
/// <reference path="actor.ts" />
/// <reference path="effects.ts" />
/// <reference path="item.ts" />
/// <reference path="creature.ts" />
/// <reference path="map.ts" />
/// <reference path="gui.ts" />
/// <reference path="engine.ts" />
module Game {
    "use strict";
	/*
		This function is called when the document has finished loading in the browser.
		It creates the root console, register the keyboard and mouse event callbacks, and starts the frame rendering loop.
	*/
    $(function() {
        try {
            Umbra.init();
            var engine = new Engine();
            var app: Umbra.Application = new Umbra.Application();
            app.run(engine);
        } catch (e) {
            console.log("ERROR in " + e.fileName + ":" + e.lineNumber + " : " + e.message);
            console.log(e.stack);
        }
    });
}
