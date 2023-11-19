

function KarFile(){
	var file;
}


KarFile.prototype.readFileInput=function(file,onload){
	var karfile=this;
	karfile.fileName=file.files[0].name.split(".")[0];
	this.readBlob(file.files[0],onload);
}

KarFile.prototype.readUrl=function(url,onload) {
	var oReq = new XMLHttpRequest();
	var karfile=this;
	var link=document.createElement("A");
	link.href=url;
	console.log(link.path);
	karfile.fileName=url;
	oReq.open('GET', url, true);
	oReq.responseType = 'arraybuffer';
	oReq.onload = function(oEvent) {
		karfile.readBuffer(oReq.response);
		onload(karfile,oReq.response);
	};
	oReq.send(null);
}

KarFile.prototype.readBlob=function (blob,onload){
	var reader = new FileReader();
	var karfile=this;
	
    reader.onload = function(loadedEvent) {
		console.log("Loaded");
		var buffer=(loadedEvent.target.result);
		karfile.readBuffer(buffer);
		onload(karfile);
	}
	reader.onprogress=function(progress){
		console.log("Progress: "+progress.loaded+"/"+progress.total);
	}
	reader.onerror=function(error){
		console.log("Error: ");
		console.log(error);
	}
	reader.readAsArrayBuffer(blob);
}

KarFile.prototype.readBuffer=function (buffer){
	var midiFile = new MIDIFile(buffer);
	this.midiFile=midiFile;
	
	this.midiData={
		format:midiFile.header.getFormat(),// 0, 1 or 2
		trackCount:midiFile.header.getTracksCount(), // n
		timeDivision:midiFile.header.getTimeDivision(),		
	}
	
	// Time division
	if(midiFile.header.getTimeDivision() === MIDIFileHeader.TICKS_PER_BEAT) {
		this.midiData.ticksPerBeat=midiFile.header.getTicksPerBeat();
	} else {
		this.midiData.frames=midiFile.header.getSMPTEFrames();
		this.midiData.ticksPerFrame=midiFile.header.getTicksPerFrame();
	}
	
	
}

KarFile.prototype.readEvents=function(){
	this.MIDIEvents=this.midiFile.getMidiEvents();
	this.trackEvents=[];
	for(var idx in this.MIDIEvents){
		var ev=this.MIDIEvents[idx];
		if (!this.trackEvents[ev.track]){
			this.trackEvents[ev.track]=[];
		}
		this.trackEvents[ev.track].push(ev);
	}
	return this.trackEvents;
}

KarFile.prototype.convertText=function(txt){
	return txt.replace("\\","\n").replace("/","\n");
}

KarFile.prototype.getText=function(){
	this.textEvents=this.midiFile.getLyrics();
	this.text=[];
	
	for(var idx in this.textEvents){
		var ev=this.textEvents[idx];
		if (!this.text[ev.track]){
			this.text[ev.track]="";
		}
		this.text[ev.track]+=this.convertText(ev.text);
	}
	return this.text;
}

KarFile.prototype.addLyrics=function(stime,line,trk,parts){
	if (!this.trackLines){
		this.trackLines=[];
	}
	if (this.trackLines.length==0){
		var itime=Math.max(1,stime-5000);
		var diff=Math.floor((stime-itime)/5);
		var introParts=[
			{time:itime,text:"*"},
			{time:itime+diff*1,text:"*"},
			{time:itime+diff*2,text:"*"},
			{time:itime+diff*3,text:"*"},
			{time:itime+diff*4,text:"*"}
			];
		if (line.trim()==""){
			stime=itime;
			line="*****";
			parts=introParts;
		}else{
			this.trackLines.push({time:itime,text:"*****",track:trk,parts:introParts});
		}
	}	
	this.trackLines.push({time:stime,text:line,track:trk,parts:parts});

}

KarFile.prototype.getLyrics=function(){
	if (!this.textEvents){
		this.textEvents=this.midiFile.getLyrics();	
	}
	var trackLyrics=[];
	for(var idx in this.textEvents){
		var ev=this.textEvents[idx];
		var text=this.convertText(ev.text);
		var time=Math.round(ev.playTime);
		if (!trackLyrics[ev.track]){
			trackLyrics[ev.track]=[];
		}
		trackLyrics[ev.track].push({text:text,time:time});
	}
	
	for(var trk in trackLyrics){
		var parts=[];
		var line="";
		var startTime=0;
		var lyrics=trackLyrics[trk];
		for(var idx in lyrics){
			var time=lyrics[idx].time;
			var text=lyrics[idx].text;
			if (text.charAt(0)=="\n"){
				var stime=parts.length>0?parts[0].time:time;
				
				this.addLyrics(stime,line,trk,parts);
				parts=[];
				startTime=0;
				line="";
				text=text.substring(1);
			}
			if (startTime==0){
				startTime=time;
			}
			line+=text;
			parts.push({time:time,text:text});
			if (line.charAt(line.lenght-1)=="\n" && parts.length>0){
				time=parts[0].time;
				this.addLyrics(time,line,trk,parts);
				startTime=0;
				parts=[];
				line="";
			}
		}
	}
	this.trackLyrics=trackLyrics;
	return this.trackLines;
}


//https://gist.github.com/jonleighton/958841


