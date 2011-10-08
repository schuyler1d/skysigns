if (!window.si.db) {
    window.si.init(window.ss,window.sd,{
        base_path:'',
        storage:{
            paths:'sql',
            shapes:'sql'
        },
        viewer:CanvgViewer,
        loadpaths:true
    });
}
