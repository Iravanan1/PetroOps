import { BoundingBox } from './TableStructureDetector';

export class NozzleRegionDetector {
  
  /**
   * Identifies the bounding area specific to the nozzle / wetstock section.
   */
  public static locateNozzleBlock(tableGrids: BoundingBox[]): BoundingBox | null {
    if (tableGrids.length === 0) return null;

    // Typically, the nozzle block is the first major table grid near the upper-middle section of the register.
    // Calculate the bounding box that encompasses all the nozzle rows.
    let minX = 9999, minY = 9999, maxX = 0, maxY = 0;

    tableGrids.forEach(grid => {
      if (grid.x < minX) minX = grid.x;
      if (grid.y < minY) minY = grid.y;
      if (grid.x + grid.w > maxX) maxX = grid.x + grid.w;
      if (grid.y + grid.h > maxY) maxY = grid.y + grid.h;
    });

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    };
  }
}
