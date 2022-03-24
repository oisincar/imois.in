var assert = require('chai').assert;
// var assert = require('assert');

// describe('Array', function () {
//     describe('#indexOf()', function () {
//         it('should return -1 when the value is not present', function () {
//             assert.equal([1, 2, 3].indexOf(4), -1);
//         });
//     });
// });


// var assert = require('assert');
// describe('Array', function () {
//     describe('#indexOf()', function () {
//         it('should return -1 when the value is not present', function () {
//             assert.equal([1, 2, 3].indexOf(4), -1);
//             assert.equal(-1, 3);
//         });
//     });
// });


var gs = require('../src/crosswordle_game');
var gl = require('../data/guess_list');

it('Load Guess List', function () {
    assert.isAbove(gl.GUESS_LIST.size, 5000);
});

it('GameStateCreate', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, [" cow"]);
    assert.equal(game.state.dimX, 4, "Wrong board dimensions");
    assert.equal(game.state.dimY, 1, "Wrong board dimensions");

    assert.equal(Object.keys(game.state.tiles).length, 3);

    assert.deepEqual(game.getTile(1, 0).position, [1, 0]);
});

it('GuessNotAWord', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, [" cow"]);

    let guess = [
        {'letter': 'x', 'position': [1, 0]},
        {'letter': 'z', 'position': [2, 0]},
        {'letter': 'a', 'position': [3, 0]},
    ];

    var res = game.makeGuess(guess);
    assert.isNotOk(res.success, "Guess should've failed");
});

it('GuessPartial', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, ["run"]);

    let guess = [
        {'letter': 'n', 'position': [0, 0]},
        {'letter': 'u', 'position': [1, 0]},
        {'letter': 't', 'position': [2, 0]},
    ];
    // RUN
    // NUT

    var res = game.makeGuess(guess);
    assert.isOk(res.success, "Guess should've succeeded");
    assert.isOk(res.tiles_changed[0].state == gs.TILE_STATE_ELSEWHERE);
    assert.isOk(res.tiles_changed[1].state == gs.TILE_STATE_CORRECT);
    assert.isOk(res.tiles_changed[2].state == gs.TILE_STATE_WRONG);
});

it('Solve', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, [" cow"]);

    let guess = [
        {'letter': 'c', 'position': [1, 0]},
        {'letter': 'o', 'position': [2, 0]},
        {'letter': 'w', 'position': [3, 0]},
    ];

    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_ONGOING);

    var res = game.makeGuess(guess);
    assert.isOk(res.success, "Guess should've succeeded");

    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_WON);
});

it('Loose', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, [" cow"]);

    let guess = [
        {'letter': 'r', 'position': [1, 0]},
        {'letter': 'u', 'position': [2, 0]},
        {'letter': 'n', 'position': [3, 0]},
    ];

    for (var i = 0; i < 9; i++) {
        assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_ONGOING);
        let res = game.makeGuess(guess);
    }
    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_LOST);
});

it('BoardBreakdown', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, ["cow", "a  ", "t  "]);

    let guess1 = [
        {'letter': 'r', 'position': [0, 0]},
        {'letter': 'a', 'position': [1, 0]},
        {'letter': 'w', 'position': [2, 0]},
    ];
    let guess2 = [
        {'letter': 'n', 'position': [0, 0]},
        {'letter': 'o', 'position': [1, 0]},
        {'letter': 't', 'position': [2, 0]},
    ];

    for (var i = 0; i < 9; i++) {
        let res1 = game.makeGuess(guess1);
        let res2 = game.makeGuess(guess2);
    }
    console.log(game.getBoardBreakdown());
    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_LOST);
});


it('Last Guess', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, ["cow", "a  ", "t  "]);

    // Guess horizontal word wrong 8 times, then get it...
    let guess = [
        {'letter': 'r', 'position': [0, 0]},
        {'letter': 'a', 'position': [1, 0]},
        {'letter': 'w', 'position': [2, 0]},
    ];
    for (var i = 0; i < 8; i++) {
        game.makeGuess(guess);
    }

    guess = [
        {'letter': 'c', 'position': [0, 0]},
        {'letter': 'o', 'position': [1, 0]},
        {'letter': 'w', 'position': [2, 0]},
    ];
    game.makeGuess(guess);
    // Last guess still gets in on time...
    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_ONGOING);

    // --- Vertical word ---
    guess = [
        {'letter': 'c', 'position': [0, 0]},
        {'letter': 'a', 'position': [0, 1]},
        {'letter': 'n', 'position': [0, 2]},
    ];

    game.makeGuess(guess);
    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_ONGOING);

    guess = [
        {'letter': 'c', 'position': [0, 0]},
        {'letter': 'a', 'position': [0, 1]},
        {'letter': 't', 'position': [0, 2]},
    ];

    game.makeGuess(guess);
    assert.equal(game.state.gameplay_state, gs.GAMEPLAY_STATE_WON);
    console.log(game.getBoardBreakdown());
});

it('SerializeDeserialize', function () {
    let game = gs.CrosswordleGame.FromSolution(gl.GUESS_LIST, ["run"]);

    let guess = [
        {'letter': 'n', 'position': [0, 0]},
        {'letter': 'u', 'position': [1, 0]},
        {'letter': 't', 'position': [2, 0]},
    ];
    // RUN
    // NUT

    var res = game.makeGuess(guess);

    console.log(game.state);
    var str = JSON.stringify(game.state);
    console.log(str);
    var data = JSON.parse(str);
    console.log(data);
});
