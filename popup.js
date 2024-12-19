document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("categoryForm");
  const newCategoryInput = document.getElementById("newCategory");

  const todayFolderName = getTodayFolderName();

  // Start by searching for the "Categories" folder
  chrome.bookmarks.search({ title: "Categories" }, (results) => {
    if (results.length === 0) {
      console.error("No 'Categories' folder found!");
      form.innerHTML = "<p>'Categories' folder not found. Please create it in bookmarks.</p>";
      return;
    }

    const categoriesFolderId = results[0].id;

    // Fetch all subfolders recursively
    fetchAllSubfolders(categoriesFolderId, "", (allFolders) => {
      // Add today's date as the first, pre-checked category
      createCheckbox(todayFolderName, form, true);

      // Add all folder paths as checkboxes
      allFolders.forEach((folder) => {
        createCheckbox(folder.path, form, false);
      });
    });
  });

  // Save button logic
  document.getElementById("saveBtn").addEventListener("click", () => {

    console.log("Save button logic");
    // alert("Save button logic");


    // Collect selected categories
    const checkboxes = document.querySelectorAll("#categoryForm input[type='checkbox']:checked");
    const selectedCategories = Array.from(checkboxes).map((checkbox) => checkbox.value);

    if (selectedCategories.length === 0) {
      alert("Please select at least one category!");
      return;
    }

// Get the current tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const url = tab.url;
        const title = tab.title;

        // alert("debug");

        // Add the page to each selected category
        addPageToCategories(selectedCategories, title, url, () => {
          // If a new category is specified, create it and add the bookmark
          const newCategoryName = newCategoryInput.value.trim();
          if (newCategoryName) {
            addNewCategoryAndBookmark(newCategoryName, title, url);
          }
          window.close();
        });
      });
    });
  });


// Utility: Get today's date as MMDD
      function getTodayFolderName() {
        const date = new Date();
        return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
      }

// Recursively fetch subfolders under a parent folder
      function fetchAllSubfolders(parentId, path, callback, folders = []) {
        chrome.bookmarks.getChildren(parentId, (children) => {
          let pending = children.length;

          if (pending === 0) callback(folders);

          children.forEach((child) => {
            if (child.url === undefined) { // Folder
              const fullPath = path ? `${path}/${child.title}` : child.title;
              folders.push({id: child.id, path: fullPath});

              fetchAllSubfolders(child.id, fullPath, (subFolders) => {
                folders.push(...subFolders);
                pending -= 1;
                if (pending === 0) callback(folders);
              });
            } else {
              pending -= 1;
              if (pending === 0) callback(folders);
            }
          });
        });
      }

// Create a checkbox for a category
      function createCheckbox(name, form, preChecked = false) {
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" value="${name}" ${preChecked ? "checked" : ""}> ${name}`;
        form.appendChild(label);
        form.appendChild(document.createElement("br"));
      }

// Add the page to selected categories
function addPageToCategories(categories, title, url, callback) {

  console.log("Starting to add bookmark to categories:", categories);

  // Search for the root "Categories" folder
  chrome.bookmarks.search({ title: "Categories" }, (results) => {
    if (results.length === 0) {
      console.error("Categories folder not found!");
      return;
    }

    const categoriesFolderId = results[0].id;
    console.log("Found 'Categories' folder ID:", categoriesFolderId);

    categories.forEach((categoryPath) => {
      console.log("Processing path:", categoryPath);
      const pathParts = categoryPath.split("/"); // Split folder path into levels
      let currentParentId = categoriesFolderId; // Start at the "Categories" root

      console.log("pathParts:", pathParts);

      // Recursive function to navigate or create folders step by step
      const createFoldersSequentially = (index) => {
        if (index >= pathParts.length) {
          // Base case: all folder levels traversed, save the bookmark
          console.log(`Reached final folder for path "${categoryPath}", saving bookmark...`);
          alert(`Reached final folder for path "${categoryPath}", saving bookmark...`);
          chrome.bookmarks.create(
              { parentId: currentParentId, title: title, url: url },
              () => console.log(`Bookmark saved successfully in: ${categoryPath}`)
          );
          return;
        }

        const folderName = pathParts[index];
        console.log(`Searching for folder: "${folderName}" under parent ID: ${currentParentId}`);

        // Search for the folder at the current level
        chrome.bookmarks.getChildren(currentParentId, (children) => {
          const existingFolder = children.find((child) => child.title === folderName && !child.url);

          if (existingFolder) {
            // Folder exists, move to the next level
            console.log(`Folder "${folderName}" found, moving into it (ID: ${existingFolder.id}).`);
            currentParentId = existingFolder.id;
            createFoldersSequentially(index + 1);
          } else {
            // Folder doesn't exist, create it
            console.log(`Folder "${folderName}" not found, creating it under ID: ${currentParentId}.`);
            chrome.bookmarks.create({ parentId: currentParentId, title: folderName }, (newFolder) => {
              console.log(`Folder "${folderName}" created successfully (ID: ${newFolder.id}).`);
              currentParentId = newFolder.id;
              createFoldersSequentially(index + 1);
            });
          }
        });
      };

      // Start creating folders step by step
      createFoldersSequentially(0);
    });

    callback();
  });
}

// Add a new category folder and bookmark the page there
      function addNewCategoryAndBookmark(newCategoryName, title, url) {
        chrome.bookmarks.search({title: "Categories"}, (results) => {
          if (results.length === 0) return;

          const categoriesFolderId = results[0].id;

          chrome.bookmarks.create({parentId: categoriesFolderId, title: newCategoryName}, (newFolder) => {
            chrome.bookmarks.create({parentId: newFolder.id, title: title, url: url});
          });
        });
      }
