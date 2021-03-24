let dbGlobals = {}; // Store all indexedDB related objects in a global object called "dbGlobals".
dbGlobals.db = null; // The database object will eventually be stored here.
dbGlobals.name = "TemplateMatching"; // The name of the database.
dbGlobals.version = 1; // Must be >= 1. Be aware that a database of a given name may only have one version at a time, on the client machine.
dbGlobals.storeName = "templates"; // The name of the database's object store. Each object in the object store is a file object.

function requiredFeaturesSupported() {
  if (!window.indexedDB) {
    if (window.mozIndexedDB) {
      window.indexedDB = window.mozIndexedDB;
    } else if (window.webkitIndexedDB) {
      window.indexedDB = webkitIndexedDB;
      IDBCursor = webkitIDBCursor;
      IDBDatabaseException = webkitIDBDatabaseException;
      IDBRequest = webkitIDBRequest;
      IDBKeyRange = webkitIDBKeyRange;
      IDBTransaction = webkitIDBTransaction;
    } else {
      console.log("IndexedDB is not supported - upgrade your browser to the latest version.");
      return false;
    }
  } // if

  if (!window.indexedDB.deleteDatabase) { // Not all implementations of IndexedDB support this method, thus we test for it here.
    console.log("The required version of IndexedDB is not supported.");
    return false;
  }

  return true;
}

function openDB() {
  if (dbGlobals.db) {
    dbGlobals.db.close(); // If the database is open, you must first close the database connection before deleting it. Otherwise, the delete request waits (possibly forever) for the required close request to occur.
  }

  console.log("openDB()");
  console.log("Your request has been queued"); // Normally, this will instantly blown away by the next displayMessage().
  if (!requiredFeaturesSupported()) {
    return;
  }
  if (!window.indexedDB.open) {
    console.log("window.indexedDB.open is null in openDB()");
    return;
  } // if

  try {
    let openRequest = window.indexedDB.open(dbGlobals.name, dbGlobals.version); // Also passing an optional version number for this database.

    openRequest.onerror = function (evt) {
      console.log("openRequest.onerror fired in openDB() - error: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
    } // Some browsers may only support the errorCode property.
    openRequest.onblocked = function (evt) {
      console.log("openRequest.onblocked fired in openDB() - error: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
    } // Called if the database is opened via another process, or similar.
    openRequest.onupgradeneeded = openDB_onupgradeneeded; // Called if the database doesn't exist or the database version values don't match.
    openRequest.onsuccess = openDB_onsuccess; // Attempts to open an existing database (that has a correctly matching version value).
  } catch (ex) {
    console.log("window.indexedDB.open exception in openDB() - " + ex.message);
  }
}

function openDB_onupgradeneeded(evt) {
  console.log("openDB_onupgradeneeded()");
  let db = dbGlobals.db = evt.target.result; // A successfully opened database results in a database object, which we place in our global IndexedDB variable.

  if (!db) {
    console.log("db (i.e., evt.target.result) is null in openDB_onupgradeneeded()");
    return;
  } // if

  try {
    db.createObjectStore(dbGlobals.storeName, {
      keyPath: "checksum",
    }); // Create the object store such that each object in the store will be given an "ID" property that is auto-incremented monotonically. Thus, files of the same name can be stored in the database.
  } catch (ex) {
    console.log("Exception in openDB_onupgradeneeded() - " + ex.message);
    return;
  }

}

function openDB_onsuccess(evt) {
  console.log("openDB_onsuccess()");

  let db = dbGlobals.db = evt.target.result; // A successfully opened database results in a database object, which we place in our global IndexedDB variable.

  if (!db) {
    console.log("db (i.e., evt.target.result) is null in openDB_onsuccess()");
    return;
  } // if
  clearDB()
}

function writeDB(data) {
  let db = dbGlobals.db
  let transaction;
  try {
    transaction = db.transaction(dbGlobals.storeName, (IDBTransaction.READ_WRITE ? IDBTransaction.READ_WRITE : 'readwrite')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_WRITE value.
  } // try
  catch (ex) {
    console.log("db.transaction exception in handleFileSelection() - " + ex.message);
    return;
  } // catch

  transaction.onerror = function (evt) {
    console.log("transaction.onerror fired in handleFileSelection() - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
  }
  transaction.onabort = function () {
    console.log("transaction.onabort fired in handleFileSelection()");
  }
  transaction.oncomplete = function () {
    console.log("transaction.oncomplete fired in handleFileSelection()");
    // displayDB()
  }

  try {
    let objectStore = transaction.objectStore(dbGlobals.storeName); // Note that multiple put()'s can occur per transaction.


    let putRequest = objectStore.put(data); // The put() method will update an existing record, whereas the add() method won't.
    putRequest.onsuccess = function () {
      console.log("putRequest.onsuccess fired in handleFileSelection() ");

    } // There's at least one object in the database's object store. This info (i.e., dbGlobals.empty) is used in displayDB().
    putRequest.onerror = function (evt) {
      console.log("putRequest.onerror fired in handleFileSelection() - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
    }
    // for
  } // try
  catch (ex) {
    console.log("Transaction and/or put() exception in handleFileSelection() - " + ex.message);
    return;
  }
}

async function readDB() {
  return new Promise((res, rej) => {
    console.log("readDB()");
    let TEMPLATES = []
    let db = dbGlobals.db;
    let transaction;
    if (!db) {
      console.log("db (i.e., dbGlobals.db) is null in displayDB()");
      rej();
    } // if

    try {
      transaction = db.transaction(dbGlobals.storeName, (IDBTransaction.READ_ONLY ? IDBTransaction.READ_ONLY : 'readonly')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_ONLY value.
    } // try
    catch (ex) {
      console.log("db.transaction() exception in displayDB() - " + ex.message);
      rej()
    } // catch

    try {
      let objectStore = transaction.objectStore(dbGlobals.storeName);

      try {
        let cursorRequest = objectStore.openCursor();

        cursorRequest.onerror = function (evt) {
          console.log("cursorRequest.onerror fired in displayDB() - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
          rej();
        }


        cursorRequest.onsuccess = function (evt) {
          console.log("cursorRequest.onsuccess fired in displayDB()");

          let cursor = evt.target.result; // Get an object from the object store.

          if (cursor) {
            TEMPLATES.push(cursor.value)
            cursor.continue(); // Move to the next object (that is, file) in the object store.
          } else {
            res(TEMPLATES);
          }

        } // cursorRequest.onsuccess
      } // inner try
      catch (innerException) {
        console.log("Inner try exception in displayDB() - " + innerException.message);
        rej()
      } // inner catch
    } // outer try
    catch (outerException) {
      console.log("Outer try exception in displayDB() - " + outerException.message);
      rej();
    }
  });
}

function clearDB() {
  let db = dbGlobals.db
  let transaction;
  try {
    transaction = db.transaction(dbGlobals.storeName, (IDBTransaction.READ_WRITE ? IDBTransaction.READ_WRITE : 'readwrite')); // This is either successful or it throws an exception. Note that the ternary operator is for browsers that only support the READ_WRITE value.
  } // try
  catch (ex) {
    console.log("db.transaction exception in clearDB() - " + ex.message);
    return;
  } // catch

  transaction.onerror = function (evt) {
    console.log("transaction.onerror fired in clearDB() - error code: " + (evt.target.error ? evt.target.error : evt.target.errorCode));
  }
  transaction.onabort = function () {
    console.log("transaction.onabort fired in clearDB()");
  }
  transaction.oncomplete = function () {
    console.log("transaction.oncomplete fired in clearDB()");
    // displayDB()
  }

  try {
    let objectStore = transaction.objectStore(dbGlobals.storeName); // Note that multiple put()'s can occur per transaction.
    var objectStoreRequest = objectStore.clear();

    objectStoreRequest.onsuccess = function (event) {
      console.log("object store cleared");
    };
  } // try
  catch (ex) {
    console.log("Transaction and/or put() exception in clearDB() - " + ex.message);
    return;
  }
};