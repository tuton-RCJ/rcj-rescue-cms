const logger = require('../config/logger').mainLogger;

/**
 *
 * @param run Must be populated with map and tiletypes!
 * @returns {number}
 */
module.exports.calculateLineScore = function (run) {
  try {
    // console.log(run);
    let score = 0;
    let final_score;
    let multiplier = 1.0;

    let lastDropTile = 0;
    let dropTileCount = 0;

    let total_lops = 0;
    for (let i = 0; i < run.LoPs.length; i++) {
      total_lops += run.LoPs[i];
    }

    for (let i = 0; i < run.tiles.length; i++) {
      const tile = run.tiles[i];

      for (let j = 0; j < tile.scoredItems.length; j++) {
        switch (tile.scoredItems[j].item) {
          case 'checkpoint':
            const tileCount = i - lastDropTile;
            if (typeof run.LoPs[dropTileCount] === 'undefined')
              run.LoPs.push(0);
            score +=
              Math.max(tileCount * (5 - 2 * run.LoPs[dropTileCount]), 0) *
              tile.scoredItems[j].scored;
            break;
          case 'gap':
            score += 10 * tile.scoredItems[j].scored;
            break;
          case 'intersection':
            score +=
              10 * tile.scoredItems[j].scored * tile.scoredItems[j].count;
            break;
          case 'obstacle':
            score += 15 * tile.scoredItems[j].scored;
            break;
          case 'speedbump':
            score += 5 * tile.scoredItems[j].scored;
            break;
          case 'ramp':
            score += 10 * tile.scoredItems[j].scored;
            break;
          case 'seesaw':
            score += 15 * tile.scoredItems[j].scored;
            break;
        }
      }

      if (tile.isDropTile) {
        lastDropTile = i;
        dropTileCount++;
      }
    }

    let error = 1;
    if (run.rescueOrder) {
      if (typeof run.LoPs[dropTileCount] === 'undefined') run.LoPs.push(0);
      if (run.evacuationLevel == 1) {
        for (const victim of run.rescueOrder) {
          if (victim.type == 'K') {
            if (run.kitLevel == 1)
              multiplier *= Math.max(
                1100 - 25 * run.LoPs[run.map.EvacuationAreaLoPIndex],
                1000
              );
            else
              multiplier *= Math.max(
                1300 - 25 * run.LoPs[run.map.EvacuationAreaLoPIndex],
                1000
              );
            error *= 1000;
          } else if (victim.effective) {
            multiplier *= Math.max(
              1200 - 25 * run.LoPs[run.map.EvacuationAreaLoPIndex],
              1000
            );
            error *= 1000;
          }
        }
      } else if (run.evacuationLevel == 2) {
        for (const victim of run.rescueOrder) {
          if (victim.type == 'K') {
            if (run.kitLevel == 1)
              multiplier *= Math.max(
                1200 - 50 * run.LoPs[run.map.EvacuationAreaLoPIndex],
                1000
              );
            else
              multiplier *= Math.max(
                1600 - 50 * run.LoPs[run.map.EvacuationAreaLoPIndex],
                1000
              );
            error *= 1000;
          } else if (victim.effective) {
            multiplier *= Math.max(
              1400 - 50 * run.LoPs[run.map.EvacuationAreaLoPIndex],
              1000
            );
            error *= 1000;
          }
        }
      }
      multiplier /= error;
    }

    if (run.exitBonus) {
      score += Math.max(60 - 5 * total_lops, 0);
    }

    // 5 points for placing robot on first droptile (start)
    // Implicit showedUp if anything else is scored
    if (run.showedUp || score > 0) {
      score += 5;
    }

    if (run.nl) {
      score += 15 * run.nl.silverTape;
      score += 30 * run.nl.greenTape;
      score -= 5 * run.nl.misidentification;
    }

    final_score = Math.round(score * multiplier);

    const ret = {};
    ret.raw_score = score;
    ret.score = final_score;
    ret.multiplier = multiplier;
    return ret;
  } catch (e) {
    console.log(e);
  }
};

module.exports.calculateLineScoreManual = function (run) {
  try {
    // console.log(run);
    let score = 0;

    const mapTiles = [];
    for (let i = 0; i < run.map.tiles.length; i++) {
      const tile = run.map.tiles[i];

      for (let j = 0; j < tile.index.length; j++) {
        const index = tile.index[j];

        mapTiles[index] = tile;
      }
    }

    let lastDropTile = 0;
    let dropTileCount = 0;

    // console.log(mapTiles);
    for (let i = 0; i < run.tiles.length; i++) {
      const tile = run.tiles[i];
      // console.log(tile.scoredItems)
      for (let j = 0; j < tile.scoredItems.length; j++) {
        switch (tile.scoredItems[j].item) {
          case 'checkpoint':
            const tileCount = i - lastDropTile;
            score +=
              Math.max(tileCount * (5 - 2 * run.LoPs[dropTileCount]), 0) *
              tile.scoredItems[j].scored;
            // console.log(Math.max(tileCount * (5 - 2 * run.LoPs[dropTileCount]), 0) * tile.scoredItems[j].scored)
            break;
          default:
            break;
        }
      }

      if (tile.isDropTile) {
        lastDropTile = i;
        dropTileCount++;
      }
    }

    if (run.rescueOrder) {
      if (run.evacuationLevel == 1) {
        for (const victim of run.rescueOrder) {
          if (victim.effective) {
            if (victim.type == 'L') {
              score += Math.max(30 - run.LoPs[dropTileCount] * 5, 0);
            } else {
              score += Math.max(20 - run.LoPs[dropTileCount] * 5, 0);
            }
          } else {
            score += Math.max(5 - run.LoPs[dropTileCount] * 5, 0);
          }
        }
      } else if (run.evacuationLevel == 2) {
        for (const victim of run.rescueOrder) {
          if (victim.effective) {
            if (victim.type == 'L') {
              score += Math.max(40 - run.LoPs[dropTileCount] * 5, 0);
            } else {
              score += Math.max(30 - run.LoPs[dropTileCount] * 5, 0);
            }
          } else {
            score += Math.max(5 - run.LoPs[dropTileCount] * 5, 0);
          }
        }
      }
    }

    score += run.manual.gap * 10;
    score += run.manual.obstacle * 10;
    score += run.manual.speedbump * 5;
    score += (run.manual.intersection + run.manual.deadend) * 15;
    score += (run.manual.rampUP + run.manual.rampDOWN) * 5;

    if (run.exitBonus) {
      score += 20;
    }

    // 5 points for placing robot on first droptile (start)
    // Implicit showedUp if anything else is scored
    if (run.showedUp || score > 0) {
      score += 5;
    }
    if (isNaN(score)) return 0;
    return score;
  } catch (e) {}
};

/**
 *
 * @param run Must be populated with map!
 * @returns {number}
 */
module.exports.calculateMazeScore = function (run) {
  let score = 0;

  const mapTiles = [];
  for (let i = 0; i < run.map.cells.length; i++) {
    const cell = run.map.cells[i];
    if (cell.isTile) {
      mapTiles[`${cell.x},${cell.y},${cell.z}`] = cell;
    }
  }

  let victims = 0;
  let rescueKits = 0;

  for (let i = 0; i < run.tiles.length; i++) {
    const tile = run.tiles[i];
    const coord = `${tile.x},${tile.y},${tile.z}`;

    if (tile.scoredItems.speedbump && mapTiles[coord].tile.speedbump) {
      score += 5;
    }
    if (tile.scoredItems.checkpoint && mapTiles[coord].tile.checkpoint) {
      score += 10;
    }
    if (tile.scoredItems.ramp && mapTiles[coord].tile.ramp) {
      score += 10;
    }
    if (tile.scoredItems.steps && mapTiles[coord].tile.steps) {
      score += 5;
    }

    const maxKits = {
      H: 3,
      S: 2,
      U: 0,
      Heated: 1,
      Red: 1,
      Yellow: 1,
      Green: 0,
    };

    if (mapTiles[coord].tile.victims.top != 'None') {
      if (tile.scoredItems.victims.top) {
        victims++;
        if (
          mapTiles[coord].tile.victims.top == 'Red' ||
          mapTiles[coord].tile.victims.top == 'Yellow' ||
          mapTiles[coord].tile.victims.top == 'Green'
        )
          score += mapTiles[coord].isLinear ? 5 : 15;
        else score += mapTiles[coord].isLinear ? 10 : 30;
      }
      rescueKits += Math.min(
        tile.scoredItems.rescueKits.top,
        maxKits[mapTiles[coord].tile.victims.top]
      );
    }
    if (mapTiles[coord].tile.victims.right != 'None') {
      if (tile.scoredItems.victims.right) {
        victims++;
        if (
          mapTiles[coord].tile.victims.right == 'Red' ||
          mapTiles[coord].tile.victims.right == 'Yellow' ||
          mapTiles[coord].tile.victims.right == 'Green'
        )
          score += mapTiles[coord].isLinear ? 5 : 15;
        else score += mapTiles[coord].isLinear ? 10 : 30;
      }
      rescueKits += Math.min(
        tile.scoredItems.rescueKits.right,
        maxKits[mapTiles[coord].tile.victims.right]
      );
    }
    if (mapTiles[coord].tile.victims.bottom != 'None') {
      if (tile.scoredItems.victims.bottom) {
        victims++;
        if (
          mapTiles[coord].tile.victims.bottom == 'Red' ||
          mapTiles[coord].tile.victims.bottom == 'Yellow' ||
          mapTiles[coord].tile.victims.bottom == 'Green'
        )
          score += mapTiles[coord].isLinear ? 5 : 15;
        else score += mapTiles[coord].isLinear ? 10 : 30;
      }
      rescueKits += Math.min(
        tile.scoredItems.rescueKits.bottom,
        maxKits[mapTiles[coord].tile.victims.bottom]
      );
    }
    if (mapTiles[coord].tile.victims.left != 'None') {
      if (tile.scoredItems.victims.left) {
        victims++;
        if (
          mapTiles[coord].tile.victims.left == 'Red' ||
          mapTiles[coord].tile.victims.left == 'Yellow' ||
          mapTiles[coord].tile.victims.left == 'Green'
        )
          score += mapTiles[coord].isLinear ? 5 : 15;
        else score += mapTiles[coord].isLinear ? 10 : 30;
      }
      rescueKits += Math.min(
        tile.scoredItems.rescueKits.left,
        maxKits[mapTiles[coord].tile.victims.left]
      );
    }
  }

  score += Math.min(rescueKits, 12) * 10;

  score += Math.max((victims + Math.min(rescueKits, 12) - run.LoPs) * 10, 0);

  if (run.exitBonus) {
    score += victims * 10;
  }

  score -= Math.min(run.misidentification * 5, score);

  return `${score},${victims},${Math.min(rescueKits, 12)}`;
};

module.exports.calculateMazeScoreManual = function (run) {
  let score = 0;

  let victims = 0;
  let rescueKits = 0;

  score += run.manual.speedbumps * 5;
  score += run.manual.checkpoints * 10;
  score += run.manual.rampDOWN * 10;
  score += run.manual.rampUP * 20;

  let victimsL = 0;
  victimsL += run.manual.victims.linear.u.identify;
  victimsL += run.manual.victims.linear.s.identify;
  victimsL += run.manual.victims.linear.h.identify;
  victimsL += run.manual.victims.linear.heated.identify;
  rescueKits += run.manual.victims.linear.s.kit;
  rescueKits += run.manual.victims.linear.h.kit;
  rescueKits += run.manual.victims.linear.heated.kit;
  score += victimsL * 10;

  let victimsF = 0;
  victimsF += run.manual.victims.floating.u.identify;
  victimsF += run.manual.victims.floating.s.identify;
  victimsF += run.manual.victims.floating.h.identify;
  victimsF += run.manual.victims.floating.heated.identify;
  rescueKits += run.manual.victims.floating.s.kit;
  rescueKits += run.manual.victims.floating.h.kit;
  rescueKits += run.manual.victims.floating.heated.kit;
  score += victimsF * 25;

  victims = victimsL + victimsF;

  score += Math.min(rescueKits, 12) * 10;

  score += Math.max((victims + Math.min(rescueKits, 12) - run.LoPs) * 10, 0);

  if (run.exitBonus) {
    score += victims * 10;
  }

  score -= Math.min(run.misidentification * 5, score);

  return `${score},${victims},${Math.min(rescueKits, 12)}`;
};
