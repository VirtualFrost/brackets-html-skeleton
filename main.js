/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 2, maxerr: 50 */
/*global define, brackets, Mustache, $ */

/*
 * HTML Skeleton
 * Created 2014 Triangle717
 * <http://le717.github.io/>
 *
 * Licensed under The MIT License
 * <http://opensource.org/licenses/MIT/>
 */


define(function(require, exports, module) {
  "use strict";
  var AppInit            = brackets.getModule("utils/AppInit"),
      CommandManager     = brackets.getModule("command/CommandManager"),
      Dialogs            = brackets.getModule("widgets/Dialogs"),
      EditorManager      = brackets.getModule("editor/EditorManager"),
      ExtensionUtils     = brackets.getModule("utils/ExtensionUtils"),
      FileSystem         = brackets.getModule("filesystem/FileSystem"),
      FileUtils          = brackets.getModule("file/FileUtils"),
      ImageViewer        = brackets.getModule("editor/ImageViewer"),
      LanguageManager    = brackets.getModule("language/LanguageManager"),
      Menus              = brackets.getModule("command/Menus"),
      PreferencesManager = brackets.getModule("preferences/PreferencesManager"),
      ProjectManager     = brackets.getModule("project/ProjectManager"),

      ImageFiles         = LanguageManager.getLanguage("image")._fileExtensions.concat("svg"),
      Strings            = require("strings"),
      SvgSize            = require("src/SvgSize"),
      IndentSize         = require("src/IndentSize"),
      skeletonLogo       = require.toUrl("img/HTML-Skeleton.svg"),
      toolbarButtonHTML  = require("text!htmlContent/toolbarButton.html"),
      skeletonDialogHTML = require("text!htmlContent/mainDialog.html");

  var indentUnits     = "",
      localizedDialog = Mustache.render(skeletonDialogHTML, Strings),
      localizedButton = Mustache.render(toolbarButtonHTML, Strings);

  var skeletonBones = {
    image    : "<img alt='' width='size-x' height='size-y' src='src-url'>",
    inStyle  : "<style></style>",
    inScript : "<script></script>",
    extStyle : "<link rel='stylesheet' href=''>",
    viewport : "<meta name='viewport' content='width=device-width, initial-scale=1.0'>",
    extScript: "<script src=''></script>",

    basiSkel : "<!DOCTYPE html>\n<html lang=''>\n<head>\nindent-size<meta charset='UTF-8'>\n" +
        "indent-size<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
        "indent-size<title></title>\n</head>\n\n<body>\nindent-size\n</body>\n</html>\n",

    fullSkel : "<!DOCTYPE html>\n<html lang=''>\n<head>\nindent-size<meta charset='UTF-8'>\n" +
        "indent-size<meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
        "indent-size<title></title>\nindent-size<link rel='stylesheet' href=''>\n" +
        "</head>\n\n<body>\nindent-size<script src=''></script>\n</body>\n</html>\n"
  };


  // Get user's indentation settings
  // If the user ever changes their preferences,
  // we need to make sure we stay up-to-date
  PreferencesManager.on("change", function() {

    // Do NOT attempt to assign `indentUnits` directly to the function.
    // It will completely break otherwise
    var tempVar = IndentSize.getIndentation();
    indentUnits = tempVar;
  });


  /**
   * @private
   * Insert the selected elements into the document
   * @param elements The elements to be inserted into the document
   */
  function _insertSelectedElements(elements) {
    // Get the document in the full editor
    var editor = EditorManager.getCurrentFullEditor();

    if (editor) {
      // Get the elements from the list in reverse so everything is added in the proper order
      var cursor = editor.getCursorPos();

      elements.reverse().forEach(function(value) {
        editor.document.batchOperation(function() {
          // Do a regex search for the `indent-size` keyword
          // and replace it with the user's indent settings
          // Also replace all single quotes with double quotes
          value = value.replace(/indent-size/g, indentUnits)
                       .replace(/'/g, "\"");

          // Insert the selected elements at the current cursor position
          editor.document.replaceRange(value, cursor);
        });
      });
    }
    return;
  }


  /**
   * @private
   * Get skeleton choices.
   */
  function _getSelectedElements() {
    var imgWidthInput  = document.querySelector(".html-skeleton-form .img-width"),
        imgHeightInput = document.querySelector(".html-skeleton-form .img-height"),
        selections     = [],
        optionIDs      = ["#basic-skeleton", "#viewport", "#ext-style",
                          "#in-style", "#ext-script", "#in-script", "#full-skeleton"
                         ];

    // For each option that is checked, keep track of the corresponding element
    optionIDs.forEach(function(value) {
      if (document.querySelector(".html-skeleton-form " + value).checked) {
        selections.push(skeletonBones[document.querySelector(".html-skeleton-form " + value).value]);
      }
    });

    // The picture/image box was checked
    if (document.querySelector(".html-skeleton-form #img").checked) {

      // Get the width/height values from the input fields
      var imgWidth  = imgWidthInput.value,
          imgHeight = imgHeightInput.value;
      imgWidth  = imgWidth  !== "" ? imgWidth : 0;
      imgHeight = imgHeight !== "" ? imgHeight : 0;

      // Mark the image tag for addition in document,
      // replacing the placeholder values with actual ones
      var imgFilledIn = skeletonBones.image;
      imgFilledIn     = imgFilledIn.replace(/src-url/, document.querySelector(".html-skeleton-img .img-src").textContent);
      imgFilledIn     = imgFilledIn.replace(/size-x/, imgWidth);
      imgFilledIn     = imgFilledIn.replace(/size-y/, imgHeight);
      selections.push(imgFilledIn);
    }

    // Finally, add the selected elements to the document
    _insertSelectedElements(selections);
  }


  /**
   * @private
   * Create a usable, valid path to the user's selected image
   * relative to document into which it being inserted
   * @param {string} imageDir The full path to a user-selected image
   * @return {string} A usable, valid path to the image
   */
  function _createImageURL(image) {
    // Get the directory to the file the image is being inserted into
    // and just the file name of the image
    var curDir  = EditorManager.getCurrentFullEditor().document.file.parentPath,
        fileName = FileUtils.getBaseName(image);

    // If this is a saved documentand image and document are in the same folder
    if (!/^_brackets_/.test(curDir) && (curDir.toLowerCase() === image.replace(fileName, "").toLowerCase())) {
      // Use only the image file name
      image = fileName;
    }

    // Try to make the path as relative as possible
    image = ProjectManager.makeProjectRelativeIfPossible(image);

    // If the path is longer than 50 characters, split it up for better displaying
    if (image.length > 50) {
      image = image.substring(0, 51) + "<br>" + image.substring(51, image.length);
    }
    return image;
  }


  /**
   * @private
   * Check if the dark theme is enabled and return
   * the appropriate class name for a slight shadow
   * on the image preview.
   * @return {string} Appropriate shadow class name
   */
  function _getImageShadow() {
    return document.querySelector("body").classList.contains("dark") ?
      "html-skeleton-img-shadow-dark" : "html-skeleton-img-shadow";
  }


  /**
   * @private
   * Update image width/height input fields.
   * @param imageWidth {string} The image width.
   * @param imageHeight {string} The image height.
   * @return {boolean} true.
   */
  function _updateSizeInput(imgWidth, imgHeight) {
    document.querySelector(".html-skeleton-form .img-width").value = imgWidth;
    document.querySelector(".html-skeleton-form .img-height").value = imgHeight;
    return true;
  }


  function _processImage(image) {
    var  QimgCheckBox = document.querySelector(".html-skeleton-form #img");

    // The Image check box was not checked before now. Since the user has opened an image,
    // let's assume the user wants to use it and check the box for them.
    if (!QimgCheckBox.checked) {
      QimgCheckBox.checked = true;
    }

    // If only one image was selected, display it
    if (image.length === 1) {
      _displayImage(image[0]);

      // TODO Multiple images were selected
    } else {

    }
  }


  /**
   * @private
   * Display the user selected image.
   * @param imagePath {string} Absolute path to image file.
   */
  function _displayImage(imagePath) {
    var shortPath    = _createImageURL(imagePath),
        isSvgImage   = false,
        isSupported  = false,
        $imgPreview  = $(".html-skeleton-img .image-preview"),
        QerrorText   = document.querySelector(".html-skeleton-img .img-error-text"),
        QpathDisplay = document.querySelector(".html-skeleton-img .img-src");

    // Check if the image is supported and if it is an SVG image
    isSupported = LanguageManager.getLanguageForPath(imagePath).getId() === "image";
    isSvgImage  = FileUtils.getFileExtension(imagePath) === "svg" ? true : false;

    // Quickly remove the size constraints to get an accurate image size
    $imgPreview.removeClass("html-skeleton-img-container");

    // The image is an unsupported file type
    if (!isSupported && !isSvgImage) {

      // Update display for image and display extension logo
      $(".html-skeleton-img").css("position", "relative");
      $imgPreview.addClass("html-skeleton-img-container");
      QpathDisplay.style.color = "red";
      $imgPreview.removeClass(_getImageShadow());

      QpathDisplay.innerHTML = shortPath;
      QerrorText.innerHTML = "<br>is not supported for previewing!";
      $imgPreview.attr("src", skeletonLogo);

      _updateSizeInput("", "");
      return false;

      // The image is a supported file type
    } else if (isSupported || isSvgImage) {

       // Clear possible CSS applied from previewing an unsupported image
      QerrorText.innerHTML = "";
      QpathDisplay.style.color = "";

      // Position and add small shadow to container
      $(".html-skeleton-img").css("position", "relative");
      $imgPreview.addClass(_getImageShadow());

      // Show the file path and display the image
      QpathDisplay.innerHTML = shortPath;
      $imgPreview.attr("src", imagePath);
      $imgPreview.addClass("html-skeleton-img-container");
    }

    // Get the image width and height
    $imgPreview.one("load", function() {
      if (isSupported && !isSvgImage) {
        var imgWidth  = $imgPreview.prop("naturalWidth"),
            imgHeight = $imgPreview.prop("naturalHeight");
        _updateSizeInput(imgWidth, imgHeight);

        // Special routine for SVG graphics only
      } else if (isSvgImage) {
        SvgSize.getSVGSize(imagePath).then(function(sizes) {
          _updateSizeInput(sizes[0], sizes[1]);
        });
      }
    });
    return;
  }


  /**
   * @private
   * Open the file browse dialog for the user to select an image
   */
  function _showFileDialog(e) {
    FileSystem.showOpenDialog(
      true, false, Strings.FILE_DIALOG_TITLE,
      null, ImageFiles, function(cancel, selected) {
        if (!cancel && selected && selected.length > 0) {
          _processImage(selected);
        }
      }
    );
    e.preventDefault();
    e.stopPropagation();
  }


  /**
   * Display HTML Skeleton dialog box
   */
  function displaySkeletonDialog() {
    var skeletonDialog = Dialogs.showModalDialogUsingTemplate(localizedDialog),
        $dialog        = skeletonDialog.getElement(),
        $doneButton    = $(".dialog-button[data-button-id='ok']", $dialog);

    // Display logo (and any user images) using Brackets' ImageViewer
    new ImageViewer.ImageView(FileSystem.getFileForPath(skeletonLogo), $(".html-skeleton-img"));
    document.querySelector(".html-skeleton-img .image-preview").classList.add("html-skeleton-img-container");

    // Hide image stats
    var imageTip   = document.querySelector(".html-skeleton-img .image-tip"),
        imageScale = document.querySelector(".html-skeleton-img .image-scale");
    imageTip.parentNode.removeChild(imageTip);
    imageScale.parentNode.removeChild(imageScale);

    // If the Browse button is clicked, proceed to open the browse dialog
    $(".dialog-button[data-button-id='browse']", $dialog).on("click", function(e) {
      _showFileDialog(e);
    });

    // Upon closing the dialog, run function to gather and apply choices
    $doneButton.on("click", _getSelectedElements);
  }


  /**
   * @private
   * Load the extension after Brackets itself has finished loading
   */
  AppInit.appReady(function () {
    // Define the extension ID and CSS
    var EXTENSION_ID = "le717.html-skeleton";
    ExtensionUtils.loadStyleSheet(module, "css/style.css");

    // Get the user's indentation settings
    indentUnits = IndentSize.getIndentation();

    // Create a menu item in the Edit menu
    CommandManager.register(Strings.INSERT_HTML_ELEMENTS, EXTENSION_ID, displaySkeletonDialog);
    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    menu.addMenuItem(EXTENSION_ID);

    // Create toolbar icon
    $(localizedButton).appendTo("#main-toolbar > .buttons").on("click", displaySkeletonDialog);
  });
});
