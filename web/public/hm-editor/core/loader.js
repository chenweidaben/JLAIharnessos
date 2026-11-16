
/**
 * CKEditor 4 Loader - Minimal stub
 */
if (typeof CKEDITOR === 'undefined') {
    var CKEDITOR = {};
}
CKEDITOR.basePath = '/hm-editor/';
CKEDITOR.loader = {
    load: function() {},
    loadFaces: function() {}
};
CKEDITOR.getUrl = function(path) {
    return CKEDITOR.basePath + path;
};
CKEDITOR.scriptLoader = {
    load: function() {}
};
