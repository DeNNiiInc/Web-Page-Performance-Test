/* whammy.js - Realtime Video Encoder via WebM */
/* https://github.com/antimatter15/whammy */
(function(global){
  function WhammyVideo(speed, quality) { // speed: 0-1, quality: 0-1
    this.frames = [];
    this.duration = 1000 / speed;
    this.quality = quality || 0.8;
  }

  WhammyVideo.prototype.add = function(frame, duration) {
    if(typeof duration != 'undefined' && this.duration) throw "you can't pitch in duration if you have already defined a duration in the constructor";
    if('canvas' in frame) { //CanvasRenderingContext2D
      frame = frame.canvas;
    }
    if('toDataURL' in frame) {
      frame = frame.toDataURL('image/webp', this.quality); 
    } else if(typeof frame != "string") {
      throw "frame must be a a HTMLCanvasElement, a CanvasRenderingContext2D or a DataURI formatted string";
    }
    if (typeof frame === "string" && !/^data:image\/webp;base64,/ig.test(frame)) {
      throw "Input must be formatted in WebP"; 
    }
    this.frames.push({
      image: frame,
      duration: duration || this.duration
    });
  };

  WhammyVideo.prototype.compile = function(outputAsArray) {
    return new Blob([populate(this.frames, outputAsArray)], {type: "video/webm"});
  };

  function pack(values) {
    var buffer = [];
    for(var i = 0; i < values.length; i++) {
        buffer.push("0x" + values[i].toString(16));
    }
    return buffer;
  }
  
  function parseWebP(riff) {
    var VP8 = riff.RIFF[0].WEBP[0];
    
    var frame_start = VP8.indexOf('\x9d\x01\x2a'); // A VP8 keyframe starts with the 0x9d012a header
    for (var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);
    
    var width, height, tmp;
    
    //the code below is literally copied verbatim from the bitstream spec
    tmp = (c[1] << 8) | c[0];
    width = tmp & 0x3FFF;
    //var horizontal_scale = tmp >> 14;
    tmp = (c[3] << 8) | c[2];
    height = tmp & 0x3FFF;
    //var vertical_scale = tmp >> 14;
    return {
        width: width,
        height: height,
        data: VP8,
        riff: riff
    }
  }

  function getStr(string) {
    var arr = []; //new Uint8Array(string.length);
    for(var i = 0; i < string.length; i++) {
      arr.push(string.charCodeAt(i));
    }
    return arr;
  }

  function getValue(value, type) {
    var tmp = [];
    if(typeof value == "string"){
        tmp = getStr(value);
    } //else if(typeof value == "number" && value == 0) {
      //  tmp = [0];
    //} 
    else {
      // 64-bit int
      if(type == "u64"){
         throw "u64 not implemented"; 
      }
      var len = type == "f64" ? 8 : (type == "f32" ? 4 : (type == "u32" ? 4 : (type == "u16" ? 2 : 1)));
      
       // little endian
       for(var i = 0; i < len; i++){
          tmp.push(value & 0xff)
          value >>= 8;
       }
       // little endian
       
       // big endian
       //for(var i = len - 1; i >= 0; i--){
        //  tmp.push((value >> (8 * i)) & 0xff)
       //}
    }
    
    return tmp;
  }


  function generateEBML(json, outputAsArray){
    var ebml = [];
    for(var i = 0; i < json.length; i++){
      var data = json[i].data;
      if(typeof data == "object") data = generateEBML(data, outputAsArray);
      if(typeof data == "number") data = getValue(data, json[i].type);
      
      var len = data.length;
      var lenStr = "";
      
      //size
      if(len < 0x80) lenStr = [len | 0x80]; 
      else if(len < 0x4000) lenStr = [((len >> 8) & 0x3f) | 0x40, (len & 0xff)];
      else if(len < 0x200000) lenStr = [((len >> 16) & 0x1f) | 0x20, ((len >> 8) & 0xff), (len & 0xff)]; 
      else if(len < 0x10000000) lenStr = [((len >> 24) & 0x0f) | 0x10, ((len >> 16) & 0xff), ((len >> 8) & 0xff), (len & 0xff)];
      else throw "Too large";
      
      //id
      var idStr = [json[i].id];
      if (json[i].id > 0xff) {
         idStr = [(json[i].id >> 8) & 0xff, json[i].id & 0xff];
      }
      if (json[i].id > 0xffff) {
         idStr = [(json[i].id >> 16) & 0xff, (json[i].id >> 8) & 0xff, json[i].id & 0xff];
      }
      if (json[i].id > 0xffffff) {
         idStr = [(json[i].id >> 24) & 0xff, (json[i].id >> 16) & 0xff, (json[i].id >> 8) & 0xff, json[i].id & 0xff];
      }
      
      ebml = ebml.concat(idStr, lenStr, data);
    }
    
    return outputAsArray ? ebml : new Uint8Array(ebml); 
  }

  function toBinStr_old(bits){
    var data = "";
    var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : "";
    bits = pad + bits;
    for(var i = 0; i < bits.length; i+= 8){
      data += String.fromCharCode(parseInt(bits.substr(i,8),2))
    }
    return data;
  }

  function checkFrames(frames){
    var width = frames[0].width, height = frames[0].height;
    var duration = frames[0].duration;
    for(var i = 1; i < frames.length; i++){
      if(frames[i].width != width) throw "Frame " + (i + 1) + " has a different width";
      if(frames[i].height != height) throw "Frame " + (i + 1) + " has a different height";
      if(frames[i].duration < 0 || frames[i].duration > 0x7fff) throw "Frame " + (i + 1) + " has a weird duration (must be between 0 and 32767)";
      duration += frames[i].duration;
    }
    return {
      duration: duration,
      width: width,
      height: height
    };
  }


  function populate(frames, outputAsArray){
    var str = "RIFF" + getValue(0, "u32") + "WEBPVP8 "; // we will replace the 0 with the size later
    
    var riff = {
        RIFF: [
            {
               WEBP: [
                  //...
               ]
            }
        ]
    };
    
    for(var i = 0; i < frames.length; i++){
       // frames[i].image is a dataURL
       // we want to pull out the webp data
       
       // RIFF....WEBPVP8 .....
       var webp = frames[i].image.substr(23); // data:image/webp;base64,
       
       // at this point webp is base64 encoded
       // so we decode it and turn it into a binary string
       // webp = atob(webp);
       
       // 2013-07-06: atob is now supported in all major browsers
       
       var binStr = atob(webp);
       
       // we want to pull out the VP8 chunk
       var start = binStr.indexOf("VP8 ");
       if(start == -1) throw "Not a WebP file";
       
       var size = binStr.charCodeAt(start + 4) | (binStr.charCodeAt(start + 5) << 8) | (binStr.charCodeAt(start + 6) << 16) | (binStr.charCodeAt(start + 7) << 24);
       
       var vp8 = binStr.substr(start + 8, size);
       
       // we want to know the width/height of the first frame
       // because that is what will determine the video size
       
       if(i == 0) {
         var tmp = (vp8.charCodeAt(1) << 8) | vp8.charCodeAt(0); // 16 bit
         var width = tmp & 0x3FFF;
         var tmp = (vp8.charCodeAt(3) << 8) | vp8.charCodeAt(2); // 16 bit
         var height = tmp & 0x3FFF;
       }
       
       // Fix: Assign dimensions to the frame object so checkFrames can access them
       if (typeof width !== 'undefined') {
         frames[i].width = width;
         frames[i].height = height;
       } else {
         // Copy from first frame if not the first iteration
         frames[i].width = frames[0].width;
         frames[i].height = frames[0].height;
       }

       frames[i].data = vp8;
    }
    
    // Safety check for empty frames
    if (!frames || frames.length === 0) {
        throw "No frames to compile";
    }

    var info = checkFrames(frames);
    
    var CLUSTER_MAX_DURATION = 30000;
    
    var EBML = [
      {
        "id": 0x1a45dfa3, // EBML
        "data": [
          { 
            "id": 0x4286, // EBMLVersion
            "data": 1,
            "type": "u32"
          },
          { 
            "id": 0x42f7, // EBMLReadVersion
            "data": 1, 
            "type": "u32"
          },
          { 
            "id": 0x42f2, // EBMLMaxIDLength
            "data": 4, 
            "type": "u32"
          },
          { 
            "id": 0x42f3, // EBMLMaxSizeLength
            "data": 8, 
            "type": "u32"
          },
          { 
            "id": 0x4282, // DocType
            "data": "webm", 
            "type": "s"
          },
          { 
            "id": 0x4287, // DocTypeVersion
            "data": 2, 
            "type": "u32"
          },
          { 
            "id": 0x4285, // DocTypeReadVersion
            "data": 2, 
            "type": "u32"
          }
        ]
      },
      {
        "id": 0x18538067, // Segment
        "data": [
          { 
            "id": 0x1549a966, // Info
            "data": [
              { 
                "id": 0x2ad7b1, // TimecodeScale
                "data": 1000000, 
                "type": "u32"
              },
              { 
                "id": 0x4d80, // MuxingApp
                "data": "whammy", 
                "type": "s"
              },
              { 
                "id": 0x5741, // WritingApp
                "data": "whammy", 
                "type": "s"
              },
              { 
                "id": 0x2a8b, // Duration
                "data": info.duration, 
                "type": "f64"
              }
            ]
          },
          { 
            "id": 0x1654ae6b, // Tracks
            "data": [
              { 
                "id": 0xae, // TrackEntry
                "data": [
                  { 
                    "id": 0xd7, // TrackNumber
                    "data": 1, 
                    "type": "u32"
                  },
                  { 
                    "id": 0x73c5, // TrackUID
                    "data": 1, 
                    "type": "u32"
                  },
                  { 
                    "id": 0x9c, // FlagLacing
                    "data": 0, 
                    "type": "u32"
                  },
                  { 
                    "id": 0x22b59c, // Language
                    "data": "und", 
                    "type": "s"
                  },
                  { 
                    "id": 0x86, // CodecID
                    "data": "V_VP8", 
                    "type": "s"
                  },
                  { 
                    "id": 0x258688, // CodecName
                    "data": "VP8", 
                    "type": "s"
                  },
                  { 
                    "id": 0x83, // TrackType
                    "data": 1, 
                    "type": "u32"
                  },
                  { 
                    "id": 0xe0, // Video
                    "data": [
                      { 
                        "id": 0xb0, // PixelWidth
                        "data": info.width, 
                        "type": "u32"
                      },
                      { 
                        "id": 0xba, // PixelHeight
                        "data": info.height, 
                        "type": "u32"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];
    
    // clusters
    var clusters = [];
    var clusterTimecode = 0;
    
    while(frames.length > 0) {
        var clusterFrames = [];
        var clusterDuration = 0;
        
        do {
            var frame = frames.shift();
            clusterFrames.push(frame);
            clusterDuration += frame.duration;
        } while(frames.length > 0 && clusterDuration < CLUSTER_MAX_DURATION);
        
        var clusterConsole = [
            { 
               "id": 0xe7, // Timecode
               "data": Math.round(clusterTimecode), 
               "type": "u32"
            }
        ];
        
        for(var i = 0; i < clusterFrames.length; i++){
            var block = makeSimpleBlock({
                discardable: 0,
                frame: clusterFrames[i].data,
                invisible: 0,
                keyframe: 1,
                lacing: 0,
                trackNum: 1,
                timecode: Math.round(clusterTimecode)
            });
            clusterConsole.push({
                "id": 0xa3, // SimpleBlock
                "data": block,
                "type": "b"
            });
            clusterTimecode += clusterFrames[i].duration;
        }
        
        clusters.push({
            "id": 0x1f43b675, // Cluster
            "data": clusterConsole
        });
    }
    
    EBML[1].data = EBML[1].data.concat(clusters);
    
    return generateEBML(EBML, outputAsArray);
  }

  function makeSimpleBlock(data){
    var flags = 0;
    if (data.keyframe) flags |= 128;
    if (data.invisible) flags |= 8;
    if (data.lacing) flags |= (data.lacing << 1);
    if (data.discardable) flags |= 1;
    if (data.trackNum > 127) {
      throw "TrackNumber > 127 not supported";
    }
    var out = [data.trackNum | 0x80, (data.timecode >> 8) & 0xff, data.timecode & 0xff, flags];
    for(var i = 0; i < data.frame.length; i++){
      out.push(data.frame.charCodeAt(i));
    }

    return out;
  }
  
  global.Whammy = WhammyVideo;

})(this);
