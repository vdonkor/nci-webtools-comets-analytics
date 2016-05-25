var controlPage = '#tab-qualityControl';
var harmonizationPage = '#tab-harmonization';
var correlatePage = '#tab-correlate';
var helpPage = '#tab-help';
var file1;
$(document).ready(function() {
   $('#harmonizationFile').change(function(){
        if (window.FileReader) {
            var file = this.files[0];
            var reader = new FileReader();

            reader.onload = function(event) {
               var contents = event.target.result;
            }

            if(file){
               reader.readAsText(file);
               file1 = file;
            }
        }
        $('#qualityControlResult').show();

    });
   $('#mappingFile').change(function(){
        if (window.FileReader) {
            var file = this.files[0];
            var reader = new FileReader();

            reader.onload = function(event) {
               var contents = event.target.result;
            }

            if(file){
               reader.readAsText(file);
               file1 = file;
            }
        }
        $('#qualityControlResult').show();
    });

    $('#metaboliteFile').change(function(){
	        if (window.FileReader) {
	            var file = this.files[0];
	            var reader = new FileReader();

	            reader.onload = function(event) {
	               var contents = event.target.result;
	            }

	            if(file){
	               reader.readAsText(file);
	               file1 = file;
	            }
	        }
	        $('#harmonizationDiv').show();
    });

    $('#inputDataFile').change(function(){
	        if (window.FileReader) {
	            var file = this.files[0];
	            var reader = new FileReader();

	            reader.onload = function(event) {
	               var contents = event.target.result;
	            }

	            if(file){
	               reader.readAsText(file);
	               file1 = file;
	            }
	        }
	        $('#summaryDiv').show();
	        $('#heatmapDiv').show();
	        $('#clusterDiv').show();
	        $('#networkDiv').show();
    });


});

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
