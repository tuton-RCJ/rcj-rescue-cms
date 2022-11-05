const logger = require('../config/logger').mainLogger;
const { lineMap } = require('../models/lineMap');

module.exports.initLine = async function (run) {
  if (run.started) return null;

  const query = lineMap.findById(run.map);
  query.populate('tiles.tileType', '-__v');

  let map = await query.lean().exec();
  
  if (map) {
    let checkPointCount = 0;
    // Init tile data  
    run.tiles = new Array(map.indexCount).fill().map(() => ({
      scoredItems: []
    }));

    for (let m of map.tiles) {
      for (let i of m.index) {
        // Obstacle
        if (m.items.obstacles > 0) {
          run.tiles[i].scoredItems.push({
            item: "obstacle",
            scored: false,
            count: m.items.obstacles
          })
        }

        // Speedbump
        if (m.items.speedbumps > 0) {
          run.tiles[i].scoredItems.push({
            item: "speedbump",
            scored: false,
            count: m.items.speedbumps
          })
        }

        // Gap
        if (m.tileType.gaps > 0) {
          run.tiles[i].scoredItems.push({
            item: "gap",
            scored: false,
            count: m.tileType.gaps
          })
        }

        // Gap
        if (m.tileType.intersections > 0) {
          run.tiles[i].scoredItems.push({
            item: "intersection",
            scored: false,
            count: m.tileType.intersections
          })
        }

        // Seesaw
        if (m.tileType.seesaw > 0) {
          run.tiles[i].scoredItems.push({
            item: "seesaw",
            scored: false,
            count: m.tileType.seesaw
          })
        }

        // Ramp points
        if (m.items.rampPoints) {
          run.tiles[i].scoredItems.push({
            item: "ramp",
            scored: false,
            count: 1
          })
        }

        // CheckPoint
        if (m.checkPoint) {
          run.tiles[i].scoredItems.push({
            item: "checkpoint",
            scored: false,
            count: 1
          })
          checkPointCount++;
        }
      }
    }

    // Init LoPs Backet
    run.LoPs = new Array(checkPointCount + 1).fill(0);

    // NL Victim Backet
    if (run.isNL) {
      run.nl.liveVictim = new Array(map.victims.live).fill({
        "found": false,
        "identified": false
      });
  
      run.nl.deadVictim = new Array(map.victims.dead).fill({
        "found": false,
        "identified": false
      });
    }
    return run;
  } else {
    return null;
  }
};
