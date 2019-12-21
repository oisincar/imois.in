// Magic matrix to convert from state to visual result.
function generateConversionMat(squaresX, squaresY) {

    var convertMat = [];
    for (var i = 0; i < squaresX*squaresY; i++) {
        convertMat[i] = new Array(squaresX*squaresY);
    }

    // Row of final matrix.
    for (var i = 0; i < squaresX; i++) {
        for (var j = 0; j < squaresY; j++) {
            // Column of final matrix.
            for (var i2 = 0; i2 < squaresX; i2++) {
                for (var j2 = 0; j2 < squaresY; j2++) {
                    // If the points in a cross around eachother, set the result to 1.
                    var a = 0;
                    if (Math.abs(i-i2) + Math.abs(j-j2) <= 1) {
                        a = 1;
                    }
                    convertMat[i + j*squaresX][i2 + j2*squaresX] = a;
                }
            }
        }
    }
    console.log(convertMat);
    return convertMat;
}

function convertState(state, convertMat) {

    var matDim = state.length;
    var squares = new Array(matDim).fill(0);

    for (var x = 0; x < matDim; x++) {
        for (var y = 0; y < matDim; y++) {
            squares[y] ^= state[x] * convertMat[x][y];
        }
    }

    return squares;
}
