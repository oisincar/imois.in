#!/usr/bin/env python3

PUZZLES_LIST = [] # <- Paste or import list to filter


# Check if any have overlap..!

# First square must be present (filled with a letter), later 2 must be absent
overlaps = [
    ((0, 0), (1, 1), (0, 1)),
    ((0, 0), (1, 1), (1, 0)),

    ((4, 0), (3, 1), (4, 1)),
    ((4, 0), (3, 1), (3, 0)),

    ((0, 4), (1, 3), (1, 4)),
    ((0, 4), (1, 3), (0, 3)),

    ((4, 4), (3, 3), (4, 3)),
    ((4, 4), (3, 3), (3, 4)),
    ]

def has_overlap(puzzle_solution):
    for (yesx, yesy), (no1x, no1y), (no2x, no2y) in overlaps:
        if (puzzle_solution[yesy][yesx] != ' '
            and puzzle_solution[no1y][no1x] == ' '
            and puzzle_solution[no2y][no2x] == ' '):

            return True

    return False


# Don't filter historic puzzles. Keep em around as a record..!
filterFrom = 222

print(f"Filtering from puzzle {filterFrom} which leaves {PUZZLES_LIST[filterFrom-1]} as the last puzzle")

keep_puzzles = PUZZLES_LIST[:filterFrom]

for puzzle in PUZZLES_LIST[filterFrom:]:
    if not has_overlap(puzzle):
        keep_puzzles.append(puzzle)
    # else:
        # for layer in puzzle:
        #     print(layer)
        # print("\n\n")

with open("filtered_list.txt", "w") as f:
    for p in keep_puzzles:
        f.write(str(p) + ",\n")



# Analytics..!
from collections import defaultdict

centerLetterCount = defaultdict(lambda: 0)
centerWordsCount = defaultdict(lambda: 0)

for puzzle in keep_puzzles:
    centerLetter = puzzle[2][2]
    centerLetterCount[centerLetter] += 1

    centerWordsCount[puzzle[2]] += 1
    vertWord = "".join([row[2] for row in puzzle])
    centerWordsCount[vertWord] += 1

counts = list(centerLetterCount.items())
counts.sort(key=(lambda e: e[1]), reverse=True)
print(counts)

wcounts = list(centerWordsCount.items())
wcounts.sort(key=(lambda e: e[1]), reverse=True)
print(wcounts)

print(len(keep_puzzles))
