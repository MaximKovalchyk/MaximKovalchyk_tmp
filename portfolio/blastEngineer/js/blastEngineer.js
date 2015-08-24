'use strict';
var BlastEngineer = {
	initGame : function(gameDiv) {
		gameDiv.appendChild(this.createControlPanel());
		gameDiv.appendChild(this.createGameField());
	},
	createControlPanel : function() {
		console.log('createControlPanel');
		return document.createElement('div');
	},
	createGameField : function() {
		console.log('createGameField');
		return document.createElement('div');
	},
};