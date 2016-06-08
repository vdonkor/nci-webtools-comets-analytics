appComets.authUser = Backbone.Model.extend({
      defaults: {
        authStatus: null,
        user: null,
        token: null
      },
    localStorage: new Store('user-auth')
    });
