var appAdmin = {};

appAdmin.UserTableView = Backbone.View.extend({
    el: "#userTable",
    initialize: function () {
        this.model.on({
            'change:showDenied': this.renderApprovalTable,
            'change:showInactive': this.renderActivationTable
        }, this);
        this.collection.on({
            'change': this.enableButtons,
            'reset': this.resetTables
        }, this);
        this.render();
        this.collection.fetch({reset: true});
        this.approvalTemplate = _.template('<input name="approval_<%=id%>" type="radio" value="active"<%=(value=="active"?" checked=true":"")%>/> Approve<br/><input name="approval_<%=id%>" type="radio" value="deny"<%=(value=="deny"?" checked=true":"")%>/> Deny');
        this.adminifyTemplate = _.template('<input name="adminify_<%=id%>" type="checkbox"<%=((value=="admin")?" checked=true":(value=="active")?"":" disabled=true")%>/>');
        this.activationTemplate = _.template('<input name="activation_<%=id%>" type="checkbox"<%=((value=="active"||value=="admin")?" checked=true":"")%>/>');
    },
    events: {
        'change input:checkbox': 'checkboxUpdate',
        'change input:radio': 'radioUpdate',
        'click input:button': 'saveData'
    },
    noSubmit: function (e) {
        if (e.keyCode == 13) {
            e.preventDefault();
            return false;
        }
    },
    checkboxUpdate: function(e) {
        var e = $(e.target);
        var name = e.prop('id') || e.prop('name');
        var checked = e.prop('checked');
        if (name.indexOf('activation') == 0) {
            var id = name.substring(11),
                model = this.collection.get(id);
            if (checked) {
                $('[name="adminify_'+id+'"]').removeAttr('disabled');
                model.set('app_metadata',_.extend({},model.get('app_metadata'),{'comets':'active'}));
            } else {
                $('[name="adminify_'+id+'"]').removeAttr('checked').attr('disabled',true);
                model.set('app_metadata',_.extend({},model.get('app_metadata'),{'comets':'inactive'}));
            }
        } else if (name.indexOf('adminify') == 0) {
            var id = name.substring(9),
                model = this.collection.get(id);
            if (checked) {
                model.set('app_metadata',_.extend({},model.get('app_metadata'),{'comets':'admin'}));
            } else {
                model.set('app_metadata',_.extend({},model.get('app_metadata'),{'comets':'active'}));
            }
        } else {
            this.model.set(name,checked);
        }
    },
    radioUpdate: function(e) {
        var e = $(e.target);
        var name = e.prop('id') || e.prop('name'),
            id = name.substring(9),
            model = this.collection.get(id);
        var old = model.get('app_metadata').comets;
        model.set({
            'app_metadata': _.extend({},model.get('app_metadata'),{'comets':e.val()}),
            'unsaved': true
        });
    },
    enableButtons: function() {
        this.$el.find('input[type="button"]').removeAttr('disabled');
    },
    resetTables: function() {
        
        this.renderApprovalTable.apply(this);
        this.renderActivationTable.apply(this);
    },
    saveData: function() {
        var view = this;
        this.collection.sync('patch').done(function() {
            view.$el.find('input[type="button"]').attr('disabled',true);
        });
    },
    render: function() {
        var view = this;
        if (this.model.get('showDenied')) this.$el.find('[name="showDenied"]').attr('checked',true);
        if (this.model.get('showInactive')) this.$el.find('[name="showInactive"]').attr('checked',true);
        this.$el.find('#activationTable').DataTable({
            columns: [
                { title: "First Name", data: 'user_metadata.given_name' },
                { title: "Last Name", data: 'user_metadata.family_name' },
                {
                    title: "Email",
                    data: 'email',
                    render: function(value) {
                        return '<b>'+value+'</b>';
                    }
                },
                { title: "Affiliation", data: 'user_metadata.affiliation' },
                { title: "Cohort", data: 'user_metadata.cohort' },
                {
                    title: "Active",
                    className: 'text-center',
                    data: 'app_metadata.comets',
                    render: function(value,trash,obj) {
                        return view.activationTemplate({ 'value': value, 'id': obj.id });
                    },
                    width: '4em'
                },
                {
                    title: "Admin",
                    className: 'text-center',
                    data: 'app_metadata.comets',
                    render: function(value,trash,obj) {
                        return view.adminifyTemplate({ 'value': value, 'id': obj.id });
                    }
                }
            ]
        });
        this.$el.find('#approvalTable').DataTable({
            columns: [
                { title: "First Name", data: 'user_metadata.given_name' },
                { title: "Last Name", data: 'user_metadata.family_name' },
                {
                    title: "Email",
                    data: 'email',
                    render: function(value) {
                        return '<b>'+value+'</b>';
                    }
                },
                { title: "Affiliation", data: 'user_metadata.affiliation' },
                { title: "Cohort", data: 'user_metadata.cohort' },
                {
                    title: "Access",
                    data: 'app_metadata.comets',
                    render: function(value,trash,obj) {
                        return view.approvalTemplate({ 'value': value, 'id': obj.id });
                    }
                }
            ]
        });
    },
    renderApprovalTable: function() {
        var showDenied = this.model.get('showDenied');
        var data = this.collection.models.map(function(model) {
            return _.extend({'id':model.id},model.attributes);
        }).filter(function(model) {
            var comets = model.app_metadata.comets;
            return model.unsaved || comets == 'pending' || (showDenied && comets == 'deny');
        });
        $('#approvalTable').DataTable().clear().rows.add(data).draw();
    },
    renderActivationTable: function() {
        var showInactive = this.model.get('showInactive');
        var data = this.collection.models.map(function(model) {
            return _.extend({'id':model.id},model.attributes);
        }).filter(function(model) {
            var comets = model.app_metadata.comets;
            return comets == 'admin' || comets == 'active' || (showInactive && comets == 'inactive');
        });
        $('#activationTable').DataTable().clear().rows.add(data).draw();
    }
});
$(function() {
    new appAdmin.UserTableView({
        collection: new appAdmin.UserCollection(),
        model: new appAdmin.UserTableModel()
    })
    $('#logoutBtn').on('click', function (e) {
        e.preventDefault();
        var path = window.location.href;
        path = path.substring(0,path.lastIndexOf('/'));
        window.location = "/auth0_redirect?logout=" + encodeURIComponent(path.substring(0,path.lastIndexOf('/'))+"/public/logout.html");
    });
});
