/**
 * Wedding RSVP — Google Apps Script Web App
 * ------------------------------------------
 * Receives RSVP submissions from the invitation site and appends them as
 * rows to a Google Sheet.
 *
 * SETUP (done once by the couple / client — not by the developer):
 *   1. Create a new Google Sheet. Note the tab (sheet) name — default "Sheet1".
 *   2. Extensions → Apps Script. Delete any boilerplate and paste this file.
 *   3. If your tab is not named "Sheet1", update SHEET_NAME below.
 *   4. Click Deploy → New deployment → type "Web app".
 *        - Description: Wedding RSVP
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   5. Authorize when prompted, then Copy the Web app URL.
 *   6. Put that URL in the site's .env as:
 *        VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
 *   7. Redeploy after any code change (Deploy → Manage deployments → Edit → New version).
 *
 * The site posts JSON like: { "name": "...", "attending": "yes"|"no", "guests": 2 }
 * (sent as text/plain to avoid a CORS preflight).
 */

var SHEET_NAME = "Sheet1";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
      || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Add a header row the first time the sheet is empty.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Name", "Attending", "Guests"]);
    }

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Fallback: form-encoded parameters
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    sheet.appendRow([
      new Date(),
      data.name || "",
      data.attending || "",
      data.guests || 0,
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Optional: lets you open the deployment URL in a browser to confirm it is live.
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "ok", message: "Wedding RSVP endpoint is live." }))
    .setMimeType(ContentService.MimeType.JSON);
}
