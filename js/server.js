function SkyServer(base_url){
  this.base_url = base_url || '';
}
SkyServer.prototype = {
  ping:function(cb){
    this._request('ping',cb)
  },
  getEntry:function(entry, cb, opts) {
    jQuery.ajax({
      url:this.base_url+'entries/'+entry,
      dataType:'json',
      success:function(json) {
        cb({'type':"paths",'item':terms,'results':res});
        cb({'type':"shapes",'item':terms,'results':res});

        cb({'type':"entry",'item':res.rows.item(0)});
        cb({'type':"terms",'item':terms,'results':res});
      }
    });
  },
  searchTerms:function(q, cb, opts) {
    jQuery.ajax({
      url:this.base_url+'terms/'+q,
      data:opts,//request_help=true, username=foo
      dataType:'json',
      success:function(json) {
        cb({'type':"terms",'item':terms,'results':res});
      }
    });
  },
  _request:function(url, cb, opts) {
    jQuery.ajax({
      url:this.base_url+url,
      dataType:'json',
      data:opts,
      success:function(json) {
        cb({'type':"terms",'item':terms,'results':res});
      }
    });
  },
  curate:function(entry_id,rating,cb) {
    this._request('entries/'+entry_id+'/rate', {rating:rating}, cb);
  },
  newest:function(last_updated, cb) {
    //TODO: header
    this._request('newest/', {last_updated:last_updated}, cb);
  },
  update_dictionary:function(opts, cb) {
    //opts: last_updated, region
    this._request('dictionary/', args, cb);
  },
  update_account:function(user, prev_user, cb) {
    var new_user = {
      'device':prev_user.device,
      'prev_username':prev_user.username,
      'prev_password':prev_user.password,
    }
    jQuery.extend(new_user, user);
    this._request('contributors/', new_user, cb);
  },
  ///how to deal with edits?
  //// if status is unapproved, then they can keep updating
  //// if status is approved, then maybe we create a new entry, and flag the dup
  //// include ratings, client needs to remember what was synced (tag column?)
  sendEntries:function(user, entries, cb) {
    
  },
  my_statuses:function(user, cb) {
    this._request('my_status/', {'username':user.username,'password':user.password}, cb);    
  },
}