/// <reference path="../yendor/yendor.ts" />
/*
	Section: GUI
*/
module Game {
	"use strict";

	/********************************************************************************
	 * Group: generic GUI stuff
	 ********************************************************************************/
	export class Gui extends Yendor.Position {
		private _width: number;
		private _height: number
		private _console: Yendor.Console;
		private _visible: boolean = false;

		constructor(_width: number, _height: number) {
			super();
			this._width = _width;
			this._height = _height;
			this._console = new Yendor.Console(_width, _height );
		}

		get width() { return this._width; }
		get height() { return this._height; }

		isVisible() {return this._visible; }
		set visible(newValue: boolean) { this._visible = newValue; }
		show() { this._visible = true; }
		hide() { this._visible = false; }

		get console() { return this._console; }

		/*
			Function: render
			To be overloaded by extending classes.
		*/
		render(map: Map, actorManager: ActorManager, destination: Yendor.Console) {
			this._console.blit(destination, this.x, this.y);
		}

		// to be overridden when needed
		save() {}
		load() {}
	}

	export interface GuiManager {
		addGui(gui: Gui, name: string, x: number, y: number);
		renderGui(rootConsole: Yendor.Console);
	}

	/********************************************************************************
	 * Group: status panel
	 ********************************************************************************/
	export class Message {
		private _color: Yendor.Color;
		private _text: string
		constructor(_color: Yendor.Color, _text: string) {
			this._color = _color;
			this._text = _text;
		}

		get text() { return this._text; }
		get color() { return this._color; }
		darkenColor() {
			this._color = Yendor.ColorUtils.multiply(this._color, Constants.LOG_DARKEN_COEF);
		}
	}

	export class StatusPanel extends Gui implements EventListener {
		private static MESSAGE_X = Constants.STAT_BAR_WIDTH + 2;
		private messageHeight : number;
		private messages: Message[] = [];
		private mouseLookText: string = "";
		constructor(width: number, height: number) {
			super(width, height);
			this.messageHeight = height - 1;
			EventBus.getInstance().registerListener(this, EventType.LOG_MESSAGE);
			EventBus.getInstance().registerListener(this, EventType.MOUSE_MOVE);
		}

		save() {
			localStorage.setItem("statusPanel", JSON.stringify(this.messages));
		}
		load() {
			var jsonData: any = JSON.parse(localStorage.getItem("statusPanel"));
			for ( var i = 0; i < jsonData.length; i++ ) {
				var msg = new Message(jsonData[i]._color, jsonData[i]._text);
				this.messages.push(msg);
			}
		}

		processEvent( event: Event<any> ) {
			switch ( event.type ) {
				case EventType.LOG_MESSAGE :
					var msg: Message = event.data;
					this.message( msg.color, msg.text );
				break;
				case EventType.MOUSE_MOVE :
					var pos: Yendor.Position = event.data;
					if ( event.map.isInFov(pos.x, pos.y) ) {
						var actorsOnCell: Actor[] = event.actorManager.findActorsOnCell(pos, event.actorManager.getCreatures());
						actorsOnCell = actorsOnCell.concat(event.actorManager.findActorsOnCell(pos, event.actorManager.getItems()));
						actorsOnCell = actorsOnCell.concat(event.actorManager.findActorsOnCell(pos, event.actorManager.getCorpses()));
						this.handleMouseLook( actorsOnCell );
					}
				break;
			}
		}

		message(color: Yendor.Color, text: string) {
			var lines = text.split("\n");
			if ( this.messages.length + lines.length > this.messageHeight ) {
				this.messages.splice(0, this.messages.length + lines.length - this.messageHeight );
			}
			for ( var i: number = 0; i < this.messages.length; ++i ) {
				this.messages[i].darkenColor();
			}
			for ( var j: number = 0; j < lines.length; ++j ) {
				this.messages.push(new Message(color, lines[j]));
			}
		}

		render(map: Map, actorManager: ActorManager, destination: Yendor.Console) {
			this.console.clearBack("black");
			this.console.clearText();
			var player: Actor = actorManager.getPlayer();
			this.renderBar(1, 1, Constants.STAT_BAR_WIDTH, "HP", player.destructible.hp,
				player.destructible.maxHp, Constants.HEALTH_BAR_BACKGROUND, Constants.HEALTH_BAR_FOREGROUND);
			this.console.print(0, 0, this.mouseLookText);
			this.renderMessages();
			super.render(map, actorManager, destination);
		}

		private handleMouseLook( actors: Actor[] ) {
			var len: number = actors.length;
			this.mouseLookText = len === 0 ? "" : actors[0].name;
			for ( var i: number = 1; i < len; ++i) {
				var actor: Actor = actors[i];
				this.mouseLookText += "," + actor.name;
			}
		}

		private renderMessages() {
			for ( var i: number = 0; i < this.messages.length; ++i ) {
				var msg: Message = this.messages[i];
				this.console.print(StatusPanel.MESSAGE_X, i + 1, msg.text, msg.color);
			}
		}

		private renderBar(x: number, y: number, width: number, name: string, value: number,
			maxValue: number, foreColor: Yendor.Color, backColor: Yendor.Color) {
			this.console.clearBack(backColor, x, y, width, 1);
			var barWidth = Math.floor(value / maxValue * width);
			if ( barWidth > 0 ) {
				this.console.clearBack(foreColor, x, y, barWidth, 1);
			}
			var label: string = name + " : " + value + "/" + maxValue;
			this.console.print(x + Math.floor(( width - label.length) / 2), y, label);
		}
	}

	/********************************************************************************
	 * Group: inventory
	 ********************************************************************************/
	export class InventoryPanel extends Gui implements EventListener {
		static TITLE: string = "=== inventory - ESC to close ===";
		private actor: Actor;
		constructor(width: number, height: number, actor: Actor) {
			super(width, height);
			this.actor = actor;
			EventBus.getInstance().registerListener(this, EventType.KEY_PRESSED);
		}

		processEvent( event: Event<any> ) {
			if ( ! this.isVisible() && event.data.key === "i" ) {
				this.show();
			} else if (this.isVisible()) {
				if ( event.data.keyCode === KeyEvent.DOM_VK_ESCAPE ) {
					this.hide();
				} else {
					var index = event.data.key.charCodeAt(0) - "a".charCodeAt(0);
					if ( index >= 0 && index < this.actor.container.size() ) {
						var item: Actor = this.actor.container.get(index);
						if (item.pickable) {
							this.hide();
							item.pickable.use(item, this.actor, event.actorManager);
							EventBus.getInstance().publishEvent(new Event<GameStatus>(EventType.CHANGE_STATUS, GameStatus.NEW_TURN));
						}
					}
				}
			}
		}

		render(map: Map, actorManager: ActorManager, destination: Yendor.Console) {
			this.console.clearBack("maroon");
			this.console.clearText();
			var shortcut: number = "a".charCodeAt(0);
			var y: number = 1;
			this.console.print(Math.floor(this.width / 2 - InventoryPanel.TITLE.length / 2), 0, InventoryPanel.TITLE);
			for ( var i: number = 0; i < this.actor.container.size(); ++i) {
				var item: Actor = this.actor.container.get(i);
				this.console.print(2, y, "(" + String.fromCharCode(shortcut) + ") " + item.name);
				y++;
				shortcut++;
			}
			super.render(map, actorManager, destination);
		}
	}


	/********************************************************************************
	 * Group: tilePicker
	 ********************************************************************************/

	export interface TilePickerListener {
		(pos: Yendor.Position): void;
	}

	/*
		Class: TilePicker
		A background Gui that sleeps until it receives a PICK_TILE event containing a TilePickerListener.
		It then listens to mouse events until the player left-clicks a tile.
		Then it calls the TilePickerListener with the selected tile position.
	*/
	export class TilePicker extends Gui implements EventListener {
		private tilePos : Yendor.Position;
		private listener: TilePickerListener;
		private tileIsValid: boolean = false;
		private map: Map;
		constructor(map: Map) {
			super(Constants.CONSOLE_WIDTH, Constants.CONSOLE_HEIGHT);
			this.map = map;
			EventBus.getInstance().registerListener(this, EventType.PICK_TILE);
		}

		processEvent( event: Event<any> ) {
			if (!this.isVisible() && event.type === EventType.PICK_TILE ) {
				this.activate(event.data);
			} else if (this.isVisible() && event.type === EventType.MOUSE_MOVE) {
				this.updateMousePosition(event.data);
			} else if (this.isVisible() && event.type === EventType.MOUSE_CLICK) {
				if ( event.data === MouseButton.LEFT ) {
					if (! this.tileIsValid ) {
						// the tile is not in FOV. do nothing
						return;
					} else if (this.listener) {
						this.listener(this.tilePos);
					}
				}
				this.deactivate();
			}
		}

		render(map: Map, actorManager: ActorManager, console: Yendor.Console) {
			console.setChar( this.tilePos.x, this.tilePos.y, this.tileIsValid ? "+" : "x" );
			console.fore[this.tilePos.x][this.tilePos.y] = this.tileIsValid ? "green" : "red";
		}

		private activate(listener: TilePickerListener) {
			this.listener = listener;
			EventBus.getInstance().registerListener(this, EventType.MOUSE_MOVE);
			EventBus.getInstance().registerListener(this, EventType.MOUSE_CLICK);
			this.show();
			this.tileIsValid = false;
		}

		private updateMousePosition(mousePos: Yendor.Position) {
			this.tilePos = mousePos;
			this.tileIsValid = this.map.isInFov(this.tilePos.x, this.tilePos.y);
		}

		private deactivate() {
			EventBus.getInstance().unregisterListener(this, EventType.MOUSE_MOVE);
			EventBus.getInstance().unregisterListener(this, EventType.MOUSE_CLICK);
			this.hide();
		}
	}
}
