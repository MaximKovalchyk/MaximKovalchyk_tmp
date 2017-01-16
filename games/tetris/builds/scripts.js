keypressController.prototype.keypressHandler = function(e) {
  var eventName = this.keyMap[e.keyCode];
  if (eventName) {
    this.callback(eventName);
  }
};

function keypressController(HTMLNode, callback, keyMap) {
  this.callback = callback;
  this.node = HTMLNode;
  this.keyMap = keyMap;
  this.node.addEventListener('keypress', this.keypressHandler.bind(this));
}

window.addEventListener('load', function load(ev) {
  window.removeEventListener('load', load);

  var body = document.body;
  var scoreDiv = document.createElement('div');
  body.appendChild(scoreDiv);

  var view = new Print2D(body, {
    WIDTH: 300,
    HEIGHT: 400,
    BOX_SIZE: 20,
    backgroundColor: '#eee',
    objects: {
      'block': {
        color: 'black'
      },
      'none': {
        color: '#eee'
      },
    }
  });

  view.printScore = function(score) {
    scoreDiv.innerText = 'Score: ' + score;
  };

  view.youLose = function(score) {
    function youLose() {
      window.alert("YOU LOSE! Score: " + score);
    }
    window.setTimeout(youLose, 0);
  };

  var model = new TetrisModel({
    width: 15,
    height: 20,
    view: view
  });

  var controller = new keypressController(body, model.moveBlock.bind(model), {
    97: 'left',
    100: 'right',
    115: 'down',
    32: 'turn'
  });
});

Print2D.prototype.createPoint = function(x, y) {
  return {
    x: Math.round(x),
    y: Math.round(y),
  };
};

Print2D.prototype.printBlock = function(color, point, blockSize) {
  this.ctx.fillStyle = color;
  blockSize = blockSize || this.BOX_SIZE;
  this.ctx.fillRect(point.x, point.y, blockSize, blockSize);
};

Print2D.prototype.clear = function() {
  this.printBlock(this.backgroundColor, this.createPoint(0, 0), Math.max(this.WIDTH, this.HEIGHT));
};

Print2D.prototype.convertPointToPixels = function(point) {
  return this.createPoint(point.x * this.BOX_SIZE, point.y * this.BOX_SIZE);
};

Print2D.prototype.createCanvas = function() {
  this.canvas = document.createElement('canvas');
  this.canvas.width = this.WIDTH;
  this.canvas.height = this.HEIGHT;
  this.ctx = this.canvas.getContext("2d");
  this.clear();
  this.parentHTMLNode.appendChild(this.canvas);
};

Print2D.prototype.printObjects = function(name, point) {
  point = this.convertPointToPixels(point);
  this.printBlock(this.objects[name].color, point);
};

Print2D.prototype.defSettings = {
  BOX_SIZE: 16,
  WIDTH: 640,
  HEIGHT: 480,
  backgroundColor: '#eee',
  objects: {
    'wall': {
      color: '#bbb'
    },
    'none': {
      color: '#eee'
    },
  },
};

Print2D.prototype.setProperties = function(propNames, settings) {
  var self = this;
  propNames.forEach(function(propName) {
    self[propName] = settings[propName] || self.defSettings[propName];
  });
};

function Print2D(ParentHTMLNode, settings) {
  settings = settings || {};
  this.setProperties([
    'BOX_SIZE',
    'WIDTH',
    'HEIGHT',
    'objects',
    'backgroundColor'], settings);

  this.parentHTMLNode = ParentHTMLNode;
  this.createCanvas();
}

AsyncCycle = function(fn, time) {
  this.go = false;
  this.fn = fn;
  this.time = time;
};

AsyncCycle.prototype._iteration = function() {
  this.fn();
  if (this.go) {
    this.id = setTimeout(this._iteration.bind(this), this.time);
  }
};

AsyncCycle.prototype.start = function() {
  this.go = true;
  this._iteration();
};

AsyncCycle.prototype.stop = function() {
  this.go = false;
  clearTimeout(this.id);
};

TetrisModel.prototype.moveBlock = function(moveName) {
  if (this.tetrisBlock) {
    oldBlock = this.tetrisBlock;
    newBlock = this.tetrisBlock[moveName]();

    this.field.removeBlock(oldBlock);
    if (this.field.canPlaceBlock(newBlock)) {
      this.tetrisBlock = newBlock;
      this.field.placeBlock(newBlock);
      this.print();
      return true;
    }
    this.field.placeBlock(this.tetrisBlock);
  }
  return false;
};

TetrisModel.prototype.print = function() {
  var i, j, objName;
  for (i = 0; i < this.field.width; i++) {
    for (j = 0; j < this.field.height; j++) {
      objName = this.field.getCellValue(i, j) ? 'block' : 'none';
      this.view.printObjects(objName, this.view.createPoint(i, j));
    }
  }
};

TetrisModel.prototype.startCicle = function(fn) {
  return new AsyncCycle(fn, 1000 / this.SPEED);
};

TetrisModel.prototype.gameMove = function() {
  var tetrisBlock, score;
  if (this.tetrisBlock) {
    //if can move block - move
    //else add tetrisBlock on next move
    if (!this.moveBlock('down')) {
      score = this.field.burnLines(this.tetrisBlock);
      this.updateScore(score);
      this.tetrisBlock = null;
    }
  } else {
    //if game field can place block - create
    tetrisBlock = TetrisBlock.createRandom({
      x: Math.floor(this.field.width / 2),
      y: 0
    });
    if (this.field.canPlaceBlock(tetrisBlock)) {
      this.tetrisBlock = tetrisBlock;
      this.field.placeBlock(this.tetrisBlock);
    } else {
      this.gameOver();
    }
  }
  this.print();
};

TetrisModel.prototype.updateScore = function(scoreDif) {
  if (scoreDif > 0) {
    this.score += scoreDif;
    this.view.printScore(this.score);
    this.SPEED = Math.floor(this.score / 5) + 1;
    this.gameMoveCycle.time = 1000 / this.SPEED;
  }
};

TetrisModel.prototype.gameOver = function() {
  this.view.youLose(this.score);
  this.gameMoveCycle.stop();
};

function TetrisModel(args) {
  this.view = args.view;
  this.SPEED = args.SPEED || 1;
  this.tetrisBlock = null;
  this.score = 0;
  this.field = new TetrisField(args.width, args.height);
  this.gameMoveCycle = this.startCicle(this.gameMove.bind(this));
  this.gameMoveCycle.start();
  this.view.printScore(this.score);
}

TetrisBlock.prototype.removeTopLine = function() {
  var line = this.arr.shift();
  this.arr.push(line);
};

TetrisBlock.prototype.removeLeftColumn = function() {
  for (var i = 0, val; i < this.SIZE; i++) {
    val = this.arr[i].shift();
    this.arr[i].push(val);
  }
};

TetrisBlock.prototype.isFreeFirstLine = function() {
  var i, res = 0;
  for (i = 0; i < this.SIZE; i++) {
    res += this.arr[0][i];
  }
  return !res;
};

TetrisBlock.prototype.isFreeFirstColumn = function() {
  var i, res = 0;
  for (i = 0; i < this.SIZE; i++) {
    res += this.arr[i][0];
  }
  return !res;
};

TetrisBlock.prototype.turn = function() {
  var i, j, res = [];
  for (i = 0; i < this.SIZE; i++) {
    res.push([]);
    for (j = 0; j < this.SIZE; j++) {
      res[i][j] = this.arr[this.SIZE - j - 1][i];
    }
  }
  res = new TetrisBlock(this.i, this.pos, res);
  //remove free lines
  while (res.isFreeFirstLine()) {
    res.removeTopLine();
  }
  while (res.isFreeFirstColumn()) {
    res.removeLeftColumn();
  }

  return res;
};

TetrisBlock.prototype.right = function() {
  return new TetrisBlock(this.i, {
    x: this.pos.x + 1,
    y: this.pos.y
  }, this.arr);
};

TetrisBlock.prototype.left = function() {
  return new TetrisBlock(this.i, {
    x: this.pos.x - 1,
    y: this.pos.y
  }, this.arr);
};

TetrisBlock.prototype.down = function() {
  return new TetrisBlock(this.i, {
    x: this.pos.x,
    y: this.pos.y + 1
  }, this.arr);
};

TetrisBlock.prototype.SIZE = 4;
TetrisBlock.prototype.forEachWhileBlock = function(callback) {
  var i, j, res;
  for (i = 0; i < this.SIZE; i++) {
    for (j = 0; j < this.SIZE; j++) {
      if (this.arr[i][j] === 1) {
        res = callback(this.pos.x + j, this.pos.y + i);
        if (!res) {
          return;
        }
      }
    }
  }
};

TetrisBlock.bloks = [
  [
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [1, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 1, 1, 0],
    [1, 1, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [0, 0, 1, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [1, 0, 0, 0],
    [1, 1, 1, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
];

TetrisBlock.create = function(i, pos) {
  return new TetrisBlock(i, pos, TetrisBlock.bloks[i]);
};

TetrisBlock.createRandom = function(pos) {
  var randIndex = Math.round(Math.random() * (TetrisBlock.bloks.length - 1));
  return TetrisBlock.create(randIndex, pos);
};

function TetrisBlock(i, pos, arr) {
  this.blockIndex = i;
  this.arr = arr;
  this.pos = pos;
}

TetrisField.prototype.FREE_CELL = 0;
TetrisField.prototype.BLOCK_CELL = 1;

TetrisField.prototype.isItFullLine = function(y) {
  for (var x = 0; x < this.width; x++) {
    if (!this.getCellValue(x, y)) {
      return false;
    }
  }
  return true;
};

TetrisField.prototype.delLine = function(y) {
  for (var x = 0; x < this.width; x++) {
    this.field[x].splice(y, 1);
    this.field[x].unshift(0);
  }
};

TetrisField.prototype.burnLines = function(tetrisBlock) {
  var y = tetrisBlock.pos.y,
    len = tetrisBlock.pos.y + tetrisBlock.SIZE,
    count = 0;
  for (; y < len && y < this.height; y++) {
    if (this.isItFullLine(y)) {
      this.delLine(y);
      count++;
    }
  }
  return count;
};

TetrisField.prototype.generateField = function() {
  var i, j, res = [];
  for (i = 0; i < this.width; i++) {
    res.push([]);
    for (j = 0; j < this.height; j++) {
      res[i][j] = this.FREE_CELL;
    }
  }
  return res;
};

TetrisField.prototype.posNotInField = function(i, j) {
  return (i >= this.width || i < 0 || j >= this.height || j < 0);
};

TetrisField.prototype.getCellValue = function(i, j) {
  if (this.posNotInField(i, j)) {
    return this.BLOCK_CELL;
  }
  return this.field[i][j];
};

TetrisField.prototype.setCellValue = function(i, j, val) {
  this.field[i][j] = val;
};

TetrisField.prototype.canPlaceBlock = function(tetrisBlock) {
  var canPlace, self = this;
  tetrisBlock.forEachWhileBlock(function(i, j) {
    //block of tetrisBlock not on another block
    canPlace = !self.getCellValue(i, j);
    return canPlace;
  });
  return canPlace;
};

TetrisField.prototype.removeBlock = function(tetrisBlock) {
  this.setBlockVal(tetrisBlock, 0);
};

TetrisField.prototype.placeBlock = function(tetrisBlock) {
  this.setBlockVal(tetrisBlock, 1);
};

TetrisField.prototype.setBlockVal = function(tetrisBlock, val) {
  var self = this;
  tetrisBlock.forEachWhileBlock(function(i, j) {
    self.setCellValue(i, j, val);
    return true;
  });
};

function TetrisField(width, height) {
  this.width = width;
  this.height = height;
  this.field = this.generateField();
}
