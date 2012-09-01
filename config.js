window.initSkyS = function() {
    //jQuery('#error').append('<li>db_orig:'+window.openDatabase_orig+'</li>');
    jQuery('#error').append('<li>location: '+document.location+'</li>');
    window.si.init(window.ss,window.sd,{
        base_path:'',
        //0=none, 1=accessible, 2=primary
        server:0, 
        remote_path:'',
        storage:{ paths:'sql', shapes:'sql' },
        viewer:CanvgViewer,
        loadpaths:false
    });
};
jQuery(document).bind('mobileinit',initSkyS);
