var controlPage = '#tab-qualityControl';
var harmonizationPage = '#tab-harmonization';
var correlatePage = '#tab-correlate';
var helpPage = '#tab-help';

function userLogin(){
	var userName = $('#userId').val();
	var pssword = $('#password').val();
	var message = '';
	if(userName.trim() == '' || pssword.trim() == ''){
	   $('#messageDiv').html("<font color='red'>You entered invalid user ID or password!</font>");

	}else{
	  enableAllTabs();
	 $('#loginDiv').hide();
	}
}

function enableAllTabs(){
	$('#messageDiv').html('');
	$('#userId').val('');
	$('#password').val('');
	$('#logoutDiv').show();
	$('#controlTabId').attr('href', controlPage);
	$('#harmonizationTabId').attr('href', harmonizationPage);
	$('#correlateTabId').attr('href', correlatePage);
	$('#helpTabId').attr('href', helpPage);

}

function disableAllTabs(){
    $('#controlTabId').attr('href', '#');
    $('#harmonizationTabId').attr('href', '#');
	$('#correlateTabId').attr('href', '#');
	$('#helpTabId').attr('href', '#');
    $('#loginDiv').show();
    $('#logoutDiv').hide();
}
