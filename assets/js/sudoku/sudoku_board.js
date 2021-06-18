import * as wasm from "./pkg/sudoku_wasm.js";


class SudokuSolver {
    constructor(div_id) {

        // this.click_state = Array(81).fill(false);
        // this.values = Array(81).fill('');
        this.cells = Array(81);
        this.rules = Array();

        // Each rule has an ID for matching HTML and underlying rules.
        var current_rule_id = 0;

        // var $row =
        // var $square = $("<th/>", { class: 'sudoku_square' });

        for (var i = 0; i < 9; i++) {
            var cl = 'sudoku_row' + ((i % 3) == 2 ? ' sudoku_row_thicc' : '');
            var $this_row = $("<tr/>", { class: cl });
            for (var j = 0; j < 9; j++) {
                var cl = 'sudoku_square' + ((j % 3) == 2 ? ' sudoku_square_thicc' : '');
                var $sq = $("<th/>", { class: cl, sq_ix: i*9 + j, contentEditable: "true"});
                this.cells[i*9 + j] = $sq;
                $this_row.append($sq);
            }
            $('#'+div_id).append($this_row);
        }

        var parent = this;
        // This points to the currently selected rule, if there is one.
        var current_active_rule = null;

        var add_rule = function(ixs, sum) {

            var $row = $("<tr/>", {ixs: ixs, sum: sum, rule_id: current_rule_id});

            var $ixs = $(`<td>{${ixs}}</td>`);
            $row.append($ixs);
            $row.append($('<td/>', {text: sum, contentEditable: "true"}));
            var $button = $('<td><button type="button">X</button></td>');
            $row.append($button);
            $('#sudokurules').append($row);

            parent.rules.push({
                ixs: ixs,
                sum: sum,
                rule_id: current_rule_id,
                html_ixs_list: $ixs,
            });

            current_rule_id += 1;

            // Button just removes this row, html & from rules.
            $button.mousedown(function(e) {
                // Don't propigate to selecting this row.
                e.stopPropagation();
            });
            $button.click(function(e) {
                var $row = $(this).closest('tr');

                var id = $row.attr('rule_id');
                console.log("Deleted rule:", id);

                parent.rules = parent.rules.filter(function(r) {
                    return r.rule_id != id;
                });
                // Update html too...
                $row.remove();
            });

            // Clicking on the ixs lets you edit em.
            $ixs.click(function(e) {
                // Deselect previous rule
                if (current_active_rule != null) {
                    current_active_rule.html_ixs_list.removeClass('sudoku_square_selected');
                    current_active_rule = null;
                }

                // Grab the newly selected rule.
                var $row = $(this).closest('tr');
                var id = $row.attr('rule_id');
                var new_rule = null;
                parent.rules.forEach(function(r) {
                    if (r.rule_id == id) {
                        new_rule = r;
                    }
                });

                // Select this
                new_rule.html_ixs_list.addClass('sudoku_square_selected');
                current_active_rule = new_rule;

                // Deselect other squares, and select these!
                parent.deselectAll();
                new_rule.ixs.forEach(function(ix) {
                    parent.setCellSelected(parent.cells[ix], true);
                    // parent.refreshRuleIxs(current_active_rule);
                });
            });
        };

        let test_rules = Array({ixs: Array(1, 5, 8), sum: 43},
                               {ixs: Array(1, 5, 8, 13, 27), sum: 43});
        // Initilize some test rules
        test_rules.forEach(rule => {
            add_rule(rule.ixs, rule.sum);
        });

        // Button for adding new rules
        $('#add_rule_button').mousedown(function(e) {
            // Don't cause deselection of all squares.
            e.stopPropagation();
        });
        $('#add_rule_button').click(function(e) {
            add_rule(Array(), 0);
            // Set rule to be active
            current_active_rule = parent.rules[parent.rules.length - 1]
            current_active_rule.html_ixs_list.addClass('sudoku_square_selected');

            parent.refreshRuleIxs(current_active_rule);
            e.stopPropagation();
        });


        var clicking = false;
        var adding_to_selection = true;

        var div_to_cell = function(div) {
            return parent.cells[div.getAttribute('sq_ix')];
        }

        $(".sudoku_square").mousedown(function(e) {
            // If we're not holding shift - deselect other squares.
            if (!e.shiftKey) {
                parent.deselectAll();
            }
            clicking = true;
            adding_to_selection = parent.toggleCell(div_to_cell(this));
            parent.refreshRuleIxs(current_active_rule);
            e.stopPropagation();
        });
        $(document).mouseup(function(){
            clicking = false;
        })
        // When the mouse enters another square, continue doing what we were doing... adding or subtracting.
        $(".sudoku_square").mouseenter(function() {
            if (clicking) {
                parent.setCellSelected(div_to_cell(this), adding_to_selection);
                parent.refreshRuleIxs(current_active_rule);
            }
        });
        $(".sudoku_square").keyup(function() {
            parent.cellEdited(this.getAttribute('sq_ix'), this.innerText);
        });

        // If background is clicked, deselect everything.
        $("#post-main").mousedown(function(e) {
            // Deselect squares
            parent.deselectAll();
            // Also the rule
            if (current_active_rule) {
                current_active_rule.html_ixs_list.removeClass('sudoku_square_selected');
                current_active_rule = null;
            }
        });

        // SOLVE!!
        $('#solve_button').mousedown(function(e) {
            // Don't cause deselection of all squares.
            e.stopPropagation();
        });
        $('#solve_button').click(function(e) {
            let cell_values = Array(81).fill('-');
            parent.cells.forEach(function(c, ix) {
                if (c.text() != '' && c.text.length == 1) {
                    cell_values[ix] = c.text();
                }
            });
            // Just collapse to string...
            cell_values = cell_values.join("");
            console.log({
                cells: cell_values,
                rules: parent.rules,
            });
        });
        // RESET!
        $('#reset_button').mousedown(function(e) {
            // Don't cause deselection of all squares.
            e.stopPropagation();
        });
        $('#reset_button').click(function(e) {

        });
    }

    deselectAll() {
        this.cells.forEach(cell => {
            this.setCellSelected(cell, false)
        });
    }

    // Recreate the 'square ixs' list for a given rule, from selected cells.
    refreshRuleIxs(rule) {
        if (rule == null) return;

        // Clear and recreate ixs list based on currently selected squares.
        rule.ixs = [];
        var parent = this;
        this.cells.forEach(function(c) {
            if (parent.cellIsSelected(c)) {
                rule.ixs.push(c.attr('sq_ix'));
            }
        });

        // Update text
        rule.html_ixs_list.text(`{${rule.ixs}}`);
    }

    // Value changed in a cell
    cellEdited(ix, new_value) {
        console.log("Changed!", ix, new_value);
        this.cells.forEach((cell, cix) => {
            // Don't edit current cell
            if (ix != cix && this.cellIsSelected(cell)) {
                cell.text(new_value);
            }
        })
        // Propigate this to all 'selected' cells too!
    }

    setCellSelected(cell, value) {
        if (value == true) {
            cell.addClass('sudoku_square_selected');
        }
        else {
            cell.removeClass('sudoku_square_selected');
        }
    }

    cellIsSelected(cell) {
        return cell.hasClass('sudoku_square_selected');
    }

    // Returns the (new) current state of the square
    toggleCell(cell) {
        console.log(cell);
        var selected_cl = 'sudoku_square_selected';
        if (!cell.hasClass(selected_cl)) {
            cell.addClass(selected_cl);
            return true;
        }
        else {
            cell.removeClass(selected_cl);
            return false;
        }
    }
}
