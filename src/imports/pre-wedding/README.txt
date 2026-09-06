Pre-wedding photos for the Gallery mosaic.

The files in this folder are the WEB-OPTIMISED versions that actually ship
(max 1280px on the long edge, JPEG quality 78). They are picked up
automatically by filename order — the leading 01-, 02-, ... sets the order
in the mosaic.

The order is deliberate and was chosen by the couple:
  01-02  the ring photos          (the proposal, then the rings)
  03-06  the Saphan Phut set      (Memorial Bridge, Chao Phraya)
  07-11  the Suan Benjakitti set  (the park and its skywalk)

Note the mosaic lays out in masonry COLUMNS, so a reader goes down the
first column before starting the second. The groups stay contiguous in
that order, but they are not read strictly left-to-right.

The full-size files they were made from live in _originals/. That folder is
deliberately NOT matched by the import glob in GallerySection.tsx (the glob
is non-recursive), so nothing in it is ever bundled or downloaded by guests.

To add a photo:
  1. Drop the full-size file into _originals/
  2. Save a version of it here, named with the next number in sequence,
     resized to <=1280px on the long edge.

Adding a large file directly to this folder still works, but every guest
then downloads it at full size on their phone.
