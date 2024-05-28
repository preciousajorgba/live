const WebSocket = require('ws');
const Binance = require('binance-api-node').default;

// Initialize the Binance WebSocket client
const binanceWS = Binance().ws;

// Symbol and interval for which you want to receive WebSocket Kline data
let f = false; // Initialize f
let h=false;
let prev_d;
let final_can=[];
let first_c=[];
let prev_dict; // Initialize prev_dict
let no_p = 0; // Initialize no_p
let trend_list = []; // Initialize trend_list
let d_open, d_high, d_low, d_close, d_tyme; // Initialize other necessary variables
const symbol = 'BTCUSDT';
const interval = '1m'; // 1 minute interval
var fruits = [];
var period = [];
var ch_c = NaN;
var ups = 0;
var downs = 0;
var uptrend = 0;
var downtrend = 0;
var prev_closes = [0];
var highs = 0;
var lows = 0;
var clos = 0;
var opened = 0;
var last_closes = []
var Ver = NaN;
var hdl = NaN;
var r = NaN;
var s = NaN;
var candles_dicts = [];
var new_candle_sticks = [];
var side_way=[];
var new_candles = false;
var final_candles = [];
var chart_dict = [];
var can_list = [];
var rp = NaN;
var trend_dicts = [];
var trends = NaN;
var g=false;

function hl_di(closes) {
  let results = [];
  let PvHigh_list = [];
  let PvLow_list = [];
  let Dir_list = [];
  let Di_list = [];
  // let Dl_list = [];
  // let Dh_list = [];
  let OriDl_list = [];
  let OriDh_list = [];
  let pvHighDiff_list = []
  let pvLowDiff_list = []
  let pvHigh = NaN;
  let pvLow = NaN;
  let pvHighDiff = NaN;
  let pvLowDiff = NaN;
  let dir = NaN;
  let di = NaN;
  let dl = NaN;
  let dh = NaN;
  let oriDl = NaN;
  let oriDh = NaN;

  for (let i = 1; i < closes.length; i++) {
    let pvClose = closes[i]; // Current close
    let pvOpen = closes[i - 1]; // Previous close (now representing open)


    // Calculate High and Low based on Open and Close
    if (pvClose === pvOpen) {
      pvHigh = pvClose;
    } else if (pvClose > pvOpen) {
      pvHigh = pvClose;
    } else {
      pvHigh = pvOpen;
    }
    PvHigh_list.push(pvHigh);

    pvLow = (pvClose > pvOpen) ? pvOpen : pvClose;
    PvLow_list.push(pvLow);

    // Calculate High and Low difference
    if ((PvHigh_list.length > 1) && (PvLow_list.length > 1)) {
      pvHighDiff = pvHigh - PvHigh_list[PvHigh_list.length - 2]; // Use previous high
      pvLowDiff = pvLow - PvLow_list[PvLow_list.length - 2]; // Use previous low
      pvHighDiff_list.push(pvHighDiff)
      pvLowDiff_list.push(pvLowDiff)

      if ((pvHighDiff_list.length > 1) && (pvLowDiff_list.length > 1)) {
        // Calculate direction (upward movement)
        if (pvHighDiff > 0) {
          dir = pvHighDiff
        } else if (pvHighDiff === 0) {
          dir = pvHighDiff_list[pvHighDiff_list.length - 2]
        } else {
          dir = pvHighDiff
        }
        Dir_list.push(dir);


        // Calculate DI (downward movement)
        if (pvLowDiff < 0) {
          di = pvLowDiff
        } else if (pvLowDiff === 0) {
          di = pvLowDiff_list[pvLowDiff_list.length - 2]
        } else {
          di = pvLowDiff
        }
        Di_list.push(di);


        // Calculate DL (previous low if current low difference is 0)
        dl = (pvLowDiff === 0) ? pvLow : dl; // Use previous low
        //Dl_list.push(dl);

        // Calculate DH (previous high if current low difference is 0)
        dh = (pvLowDiff === 0) ? pvHigh : dh; // Use previous high
        //Dh_list.push(dh);

        if ((Di_list.length > 1) && (Dir_list.length > 1)) {
          // Calculate original DL (previous low if previous DI is negative and current DI is positive)
          oriDl = ((Di_list[Di_list.length - 2] < 0) && (dir > 0)) ? PvLow_list[PvLow_list.length - 2] : oriDl; // Use previous close here

          // Calculate original DH (previous high if previous DIR is positive and current DI is negative)
          oriDh = ((Dir_list[Dir_list.length - 2] > 0) && (di < 0)) ? PvHigh_list[PvHigh_list.length - 2] : oriDh; // Use previous close here


          // Store calculated values
          //results.push({
          //  pvHighDiff,
          // pvLowDiff,
          // dir,
          // di,
          // dl,
          // dh,
          ///  oriDl,
          // oriDh,
          // Add any other calculated values you need
          // });
          results.push([oriDh, oriDl])
        }
      }
    }
  }

  return [oriDh, oriDl];
}

function slidingSum(arr, length) {
  var sumResult = 0;
  for (var i = arr.length - length; i < arr.length; i++) {
    if (i >= 0) {
      sumResult += arr[i];
    }
  }
  return sumResult;
}

function nz(value, replacement = 0) {
  if (Array.isArray(value)) {
    return value.map(val => (isNaN(val) || val === null ? replacement : val));
  } else {
    return isNaN(value) || value === null ? replacement : value;
  }
}

function Var_Fun(src, length, percent) {
  var alpha = 2 / (length + 1);
  var vud1 = [];
  var vdd1 = [];
  var pre_VAR = 0.0;
  var pre_longstop = NaN;
  var pre_shortstop = NaN;
  var pre_dir = NaN;

  for (var i = 1; i < src.length; i++) {
    var vud = src[i] > src[i - 1] ? src[i] - src[i - 1] : 0;
    var vdd = src[i] < src[i - 1] ? src[i - 1] - src[i] : 0;

    vud1.push(vud);
    vdd1.push(vdd);

    var vUD = slidingSum(vud1, 2);
    var vDD = slidingSum(vdd1, 2);
    var vCMO = nz((vUD - vDD) / (vUD + vDD));

    var VAR = nz(alpha * Math.abs(vCMO) * src[i]) + (1 - alpha * Math.abs(vCMO)) * nz(pre_VAR);
    pre_VAR = VAR;


    var fark = VAR * percent * 0.01
    var longStop = VAR - fark
    var longStopPrev = nz(pre_longstop, longStop)
    longStop = VAR > longStopPrev ? Math.max(longStop, longStopPrev) : longStop
    pre_longstop = longStop
    var shortStop = VAR + fark
    var shortStopPrev = nz(pre_shortstop, shortStop)
    shortStop = VAR < shortStopPrev ? Math.min(shortStop, shortStopPrev) : shortStop
    pre_shortstop = shortStop
    var dir = 1
    dir = nz(pre_dir, dir);
    dir = (dir === -1 && VAR > shortStopPrev) ? 1 : (dir === 1 && VAR < longStopPrev) ? -1 : dir;
    pre_dir = dir

    var MT = dir == 1 ? longStop : shortStop
    var OTT = VAR > MT ? MT * (200 + percent) / 200 : MT * (200 - percent) / 200
  }

  return [vCMO, vUD, vDD, VAR, OTT];
}

function d_hl_trendsticks_1(data) {

  let d_high_list = [];
  let d_low_list = [];
  let d_high = NaN;
  let d_low = NaN;
  let h_open = NaN;
  let h_high = NaN;
  let h_low = NaN;
  let h_close = NaN;
  let h_dhigh = NaN;
  let h_low_list = [];
  let h_dhigh_list = [];
  let dh_dhigh_list = [];
  let h_high_list = [];
  let dh_low = NaN;
  let dh_low_list = [];
  let dh_dhigh = NaN;
  let nocolor = NaN;
  let trendstick = NaN;
  let nocolor_list = [NaN];
  let trendstick_list = [NaN];
  let nocolor_open = NaN;
  let nocolor_high = NaN;
  let nocolor_low = NaN;
  let nocolor_close = NaN;






  for (let i = 1; i < data.length; i++) {


    let d_open = Number(data[i].open);
    let d_close = (Number(data[i].close));
    if (d_close > d_open) {
      d_high = d_close;
    } else if (d_close < d_open) {
      d_high = d_open;
    } else {
      d_high = 1;
    }


    if (d_close > d_open) {
      d_low = d_open;
    } else if (d_close < d_open) {
      d_low = d_close;
    } else {
      d_low = 1;
    }

    if ((d_high_list.length > 1) && (!isNaN(d_high_list[d_high_list.length - 2])) && (d_low_list.length > 1) && !isNaN(d_low_list[d_low_list.length - 2])) {
      d_high = (d_high === 1) ? d_high_list[d_high_list.length - 1] : d_high;
      d_low = (d_low === 1) ? d_low_list[d_low_list.length - 1] : d_low;


      //h_open=low[1]
      h_open = Number(data[i - 1].low);
      h_close = Number(data[i].close);
      h_low = (h_close < h_open) ? h_close : h_open;
      h_high = Number(data[i - 1].high);
      h_dhigh = (h_close > h_high) ? h_close : h_high;


      if ((h_low_list.length > 1) && (!isNaN(h_low_list[h_low_list.length - 2])) && (h_dhigh_list.length > 1) && !isNaN(h_dhigh_list[h_dhigh_list.length - 2]))

        //dh_low =close<h_low[1]?close:h_low[1]
        dh_low = (Number(data[i].close) < h_low_list[h_low_list.length - 1]) ? Number(data[i].close) : h_low_list[h_low_list.length - 1]
      //nocolor:= ((close < h_dhigh[1]) and (close == dh_low))?dh_low:nocolor[1]
      dh_dhigh = (Number(data[i].close) > h_dhigh_list[h_dhigh_list.length - 1]) ? Number(data[i].close) : h_dhigh_list[h_dhigh_list.length - 1];

      if (((dh_dhigh_list.length > 1) && (!isNaN(dh_dhigh_list[dh_dhigh_list.length - 2]))) && ((dh_low_list.length > 1) && (!isNaN(dh_low_list[dh_low_list.length - 2])))) {
        nocolor = ((Number(data[i].close) < dh_dhigh_list[dh_dhigh_list.length - 1]) && (Number(data[i].close) === dh_low)) ? dh_low : ((Number(data[i].close) > dh_low_list[dh_low_list.length - 1]) && (Number(data[i].close) === dh_dhigh)) ? dh_dhigh : nocolor//nocolor_list[nocolor_list.length-1];
        //dh_dhigh=close>h_dhigh[1]?close:h_dhigh[1]
        //dh_dhigh=(Number(data[i].close) > h_dhigh_list[h_dhigh_list.length -1 ])?Number(data[i].close):h_dhigh_list[h_dhigh_list.length -1 ];

        if ((nocolor_list.length > 1) && (!isNaN(nocolor_list[nocolor_list.length - 2]))) {

          //ncolor_open= nocolor[1]
          nocolor_open = nocolor_list[nocolor_list.length - 1];
          //ncolor_close = nocolor
          nocolor_close = nocolor;
          //ncolor_low =ncolor_close > ncolor_open?ncolor_open:ncolor_close
          nocolor_low = (nocolor_close > nocolor_open) ? nocolor_open : nocolor_close;
          //ncolor_high =ncolor_close > ncolor_open?ncolor_close:ncolor_open
          nocolor_high = (nocolor_close > nocolor_open) ? nocolor_close : nocolor_open;

          //trendsticks:=ncolor_open != ncolor_close ? ncolor_low:trendsticks[1]
          trendstick = (nocolor_open != nocolor_close) ? nocolor_low : trendstick_list[trendstick_list.length - 1]
        }
      }
    }
    dh_dhigh_list.push(dh_dhigh);
    dh_low_list.push(dh_low);
    trendstick_list.push(trendstick);
    nocolor_list.push(nocolor);
    h_low_list.push(h_low);
    h_dhigh_list.push(h_dhigh);
    d_low_list.push(d_low);
    d_high_list.push(d_high);
  }



  return { open: nocolor_open, high: nocolor_high, low: nocolor_low, close: nocolor_close }
}
function d_hl_trendsticks(data) {

  let d_high_list = [];
  let d_low_list = [];
  let d_high = NaN;
  let d_low = NaN;
  let h_open = NaN;
  let h_high = NaN;
  let h_low = NaN;
  let h_close = NaN;
  let h_dhigh = NaN;
  let h_low_list = [];
  let h_dhigh_list = [];
  let dh_dhigh_list = [];
  let h_high_list = [];
  let dh_low = NaN;
  let dh_low_list = [];
  let dh_dhigh = NaN;
  let nocolor = NaN;
  let trendstick = NaN;
  let nocolor_list = [NaN];
  let trendstick_list = [NaN];
  let nocolor_open = NaN;
  let nocolor_high = NaN;
  let nocolor_low = NaN;
  let nocolor_close = NaN;






  for (let i = 1; i < data.length; i++) {


    let d_open = Number(data[i].open);
    let d_close = (Number(data[i].close));
    if (d_close > d_open) {
      d_high = d_close;
    } else if (d_close < d_open) {
      d_high = d_open;
    } else {
      d_high = 1;
    }


    if (d_close > d_open) {
      d_low = d_open;
    } else if (d_close < d_open) {
      d_low = d_close;
    } else {
      d_low = 1;
    }

    if ((d_high_list.length > 1) && (!isNaN(d_high_list[d_high_list.length - 2])) && (d_low_list.length > 1) && !isNaN(d_low_list[d_low_list.length - 2])) {
      d_high = (d_high === 1) ? d_high_list[d_high_list.length - 1] : d_high;
      d_low = (d_low === 1) ? d_low_list[d_low_list.length - 1] : d_low;


      //h_open=low[1]
      h_open = Number(data[i - 1].low);
      h_close = Number(data[i].close);
      h_low = (h_close < h_open) ? h_close : h_open;
      h_high = Number(data[i - 1].high);
      h_dhigh = (h_close > h_high) ? h_close : h_high;


      if ((h_low_list.length > 1) && (!isNaN(h_low_list[h_low_list.length - 2])) && (h_dhigh_list.length > 1) && !isNaN(h_dhigh_list[h_dhigh_list.length - 2]))

        //dh_low =close<h_low[1]?close:h_low[1]
        dh_low = (Number(data[i].close) < h_low_list[h_low_list.length - 1]) ? Number(data[i].close) : h_low_list[h_low_list.length - 1]
      //nocolor:= ((close < h_dhigh[1]) and (close == dh_low))?dh_low:nocolor[1]
      dh_dhigh = (Number(data[i].close) > h_dhigh_list[h_dhigh_list.length - 1]) ? Number(data[i].close) : h_dhigh_list[h_dhigh_list.length - 1];

      if (((dh_dhigh_list.length > 1) && (!isNaN(dh_dhigh_list[dh_dhigh_list.length - 2]))) && ((dh_low_list.length > 1) && (!isNaN(dh_low_list[dh_low_list.length - 2])))) {
        nocolor = ((Number(data[i].close) < dh_dhigh_list[dh_dhigh_list.length - 1]) && (Number(data[i].close) === dh_low)) ? dh_low : ((Number(data[i].close) > dh_low_list[dh_low_list.length - 1]) && (Number(data[i].close) === dh_dhigh)) ? dh_dhigh : nocolor//nocolor_list[nocolor_list.length-1];
        //dh_dhigh=close>h_dhigh[1]?close:h_dhigh[1]
        //dh_dhigh=(Number(data[i].close) > h_dhigh_list[h_dhigh_list.length -1 ])?Number(data[i].close):h_dhigh_list[h_dhigh_list.length -1 ];

        if ((nocolor_list.length > 1) && (!isNaN(nocolor_list[nocolor_list.length - 2]))) {

          //ncolor_open= nocolor[1]
          nocolor_open = nocolor_list[nocolor_list.length - 1];
          //ncolor_close = nocolor
          nocolor_close = nocolor;
          //ncolor_low =ncolor_close > ncolor_open?ncolor_open:ncolor_close
          nocolor_low = (nocolor_close > nocolor_open) ? nocolor_open : nocolor_close;
          //ncolor_high =ncolor_close > ncolor_open?ncolor_close:ncolor_open
          nocolor_high = (nocolor_close > nocolor_open) ? nocolor_close : nocolor_open;

          //trendsticks:=ncolor_open != ncolor_close ? ncolor_low:trendsticks[1]
          trendstick = (nocolor_open != nocolor_close) ? nocolor_low : trendstick_list[trendstick_list.length - 1]
        }
      }
    }
    dh_dhigh_list.push(dh_dhigh);
    dh_low_list.push(dh_low);
    trendstick_list.push(trendstick);
    nocolor_list.push(nocolor);
    h_low_list.push(h_low);
    h_dhigh_list.push(h_dhigh);
    d_low_list.push(d_low);
    d_high_list.push(d_high);
  }



  return [d_high_list, h_dhigh_list, dh_low, nocolor, trendstick]
}

function d_hl_trendsticks1(data) {

  let d_high_list = [];
  let d_low_list = [];
  let d_high = NaN;
  let d_low = NaN;
  let h_open = NaN;
  let h_high = NaN;
  let h_low = NaN;
  let h_close = NaN;
  let h_dhigh = NaN;
  let h_low_list = [];
  let h_dhigh_list = [];
  let h_high_list = [];
  let dh_low = NaN;
  let dh_dhigh = NaN;
  let nocolor = NaN;
  let trendstick = NaN;
  let nocolor_list = [NaN];
  let trendstick_list = [NaN];
  let nocolor_open = NaN;
  let nocolor_high = NaN;
  let nocolor_low = NaN;
  let nocolor_close = NaN;






  for (let i = 1; i < data.length; i++) {


    let d_open = Number(data[i].open);
    let d_close = (Number(data[i].close));
    if (d_close > d_open) {
      d_high = d_close;
    } else if (d_close < d_open) {
      d_high = d_open;
    } else {
      d_high = 1;
    }


    if (d_close > d_open) {
      d_low = d_open;
    } else if (d_close < d_open) {
      d_low = d_close;
    } else {
      d_low = 1;
    }

    if ((d_high_list.length > 1) && (!isNaN(d_high_list[d_high_list.length - 2])) && (d_low_list.length > 1) && !isNaN(d_low_list[d_low_list.length - 2])) {
      d_high = (d_high === 1) ? d_high_list[d_high_list.length - 1] : d_high;
      d_low = (d_low === 1) ? d_low_list[d_low_list.length - 1] : d_low;


      //h_open=low[1]
      h_open = Number(data[i - 1].low);
      h_close = Number(data[i].close);
      h_low = (h_close < h_open) ? h_close : h_open;
      h_high = Number(data[i - 1].high);
      h_dhigh = (h_close > h_high) ? h_close : h_high;


      if ((h_low_list.length > 1) && (!isNaN(h_low_list[h_low_list.length - 2])) && (h_dhigh_list.length > 1) && !isNaN(h_dhigh_list[h_dhigh_list.length - 2]))

        //dh_low =close<h_low[1]?close:h_low[1]
        dh_low = (Number(data[i].close) < h_low_list[h_low_list.length - 1]) ? Number(data[i].close) : h_low_list[h_low_list.length - 1]

      dh_dhigh = (Number(data[i].close) > h_dhigh_list[h_dhigh_list.length - 1]) ? Number(data[i].close) : h_dhigh_list[h_dhigh_list.length - 1];
      //nocolor:= ((close < h_dhigh[1]) and (close == dh_low))?dh_low:nocolor[1]
      nocolor = ((Number(data[i].close) < h_dhigh_list[h_dhigh_list.length - 1]) && (Number(data[i].close) === dh_low)) ? dh_low : nocolor_list[nocolor_list.length - 1];
      //dh_dhigh=close>h_dhigh[1]?close:h_dhigh[1]


      if ((nocolor_list.length > 1) && (!isNaN(nocolor_list[nocolor_list.length - 2]))) {

        //ncolor_open= nocolor[1]
        nocolor_open = nocolor_list[nocolor_list.length - 1];
        //ncolor_close = nocolor
        nocolor_close = nocolor;
        //ncolor_low =ncolor_close > ncolor_open?ncolor_open:ncolor_close
        nocolor_low = (nocolor_close > nocolor_open) ? nocolor_open : nocolor_close;
        //ncolor_high =ncolor_close > ncolor_open?ncolor_close:ncolor_open
        nocolor_high = (nocolor_close > nocolor_open) ? nocolor_close : nocolor_open;

        //trendsticks:=ncolor_open != ncolor_close ? ncolor_low:trendsticks[1]
        trendstick = (nocolor_open != nocolor_close) ? nocolor_low : trendstick_list[trendstick_list.length - 1]
      }
    }
    trendstick_list.push(trendstick);
    nocolor_list.push(nocolor);
    h_low_list.push(h_low);
    h_dhigh_list.push(h_dhigh);
    d_low_list.push(d_low);
    d_high_list.push(d_high);
  }



  return { open: nocolor_open, high: nocolor_high, low: nocolor_low, close: nocolor_close }
}

function ch_candle(data) {

  var h_open = [];
  var h_close = [];
  var h_low = [];
  var h_high = [];
  var h_dhigh = [];
  var dh_low = [];
  var dh_dhigh = [];
  var previous_h_low = 0;
  var previous_h_dhigh = 0;
  var upcandle1 = [];
  var upcandle2 = [];
  var previous_upcandle1 = 0;
  var previous_upcandle2 = 0;
  var downstick = [];
  var previous_downstick = 0;

  var h_ope = [];
  var h_clos = [];
  var h_lo = [];
  var h_hig = [];
  var h_dhig = [];
  var dh_lo = [];
  var dh_dhig = [];
  var previous_h_lo = 0;
  var previous_h_dhig = 0;
  var upcandl1 = [];
  var upcandl2 = [];
  var previous_upcandl1 = 0;
  var previous_upcandl2 = 0;
  var downstic = [];
  var previous_downstic = 0;







  for (let i = 1; i < data.length; i++) {
    h_open.push(data[i - 1].low);
    h_close.push(data[i].close);
    h_low.push(data[i].close < h_open[i - 1] ? data[i].close : h_open[i - 1]);
    h_high.push(data[i - 1].high);
    h_dhigh.push(data[i].close > h_high[i - 1] ? data[i].close : h_high[i - 1]);
    dh_low.push(data[i].close < previous_h_low ? data[i].close : previous_h_low);
    dh_dhigh.push(data[i].close > previous_h_dhigh ? data[i].close : previous_h_dhigh);
    upcandle1.push(((data[i].close < previous_h_dhigh) && (data[i].close > dh_low[i - 1])) ? dh_low[i - 1] : previous_upcandle1);
    upcandle2.push(data[i].close >= previous_h_dhigh ? dh_low[i - 1] : previous_upcandle2);
    downstick.push(((dh_low[i - 1] < upcandle1[i - 1]) && (dh_low[i - 1] < upcandle2[i - 1])) ? dh_dhigh[i - 1] : previous_downstick);

    previous_h_low = h_low[i - 1];
    previous_h_dhigh = h_dhigh[i - 1];
    previous_upcandle1 = upcandle1[i - 1];
    previous_upcandle2 = upcandle2[i - 1];
    previous_downstick = downstick[i - 1];


  }

  for (let i = 1; i < data.length; i++) {
    h_ope.push(data[i - 1].high);
    h_clos.push(data[i].close);
    h_lo.push(data[i].close > h_ope[i - 1] ? data[i].close : h_ope[i - 1]);
    h_hig.push(data[i - 1].low);
    h_dhig.push(data[i].close < h_hig[i - 1] ? data[i].close : h_hig[i - 1]);
    dh_lo.push(data[i].close > previous_h_lo ? data[i].close : previous_h_lo);
    dh_dhig.push(data[i].close < previous_h_dhig ? data[i].close : previous_h_dhig);
    upcandl1.push(((data[i].close > previous_h_dhig) && (data[i].close < dh_lo[i - 1])) ? dh_lo[i - 1] : previous_upcandl1);
    upcandl2.push(data[i].close <= previous_h_dhig ? dh_lo[i - 1] : previous_upcandl2);
    downstic.push(((dh_lo[i - 1] > upcandl1[i - 1]) && (dh_lo[i - 1] > upcandl2[i - 1])) ? dh_dhig[i - 1] : previous_downstic);

    previous_h_lo = h_lo[i - 1];
    previous_h_dhig = h_dhig[i - 1];
    previous_upcandl1 = upcandl1[i - 1];
    previous_upcandl2 = upcandl2[i - 1];
    previous_downstic = downstic[i - 1];


  }
  return downstick[downstick.length - 1];
}

function deepEqual(obj1, obj2) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

function d_hl_trendsticks_02(data) {

  let d_high_list = [];
  let d_low_list = [];
  let d_high = NaN;
  let d_low = NaN;
  let h_open = NaN;
  let h_high = NaN;
  let h_low = NaN;
  let h_close = NaN;
  let h_dhigh = NaN;
  let h_low_list = [];
  let h_dhigh_list = [];
  let dh_dhigh_list = [];
  let h_high_list = [];
  let dh_low = NaN;
  let dh_low_list = [];
  let dh_dhigh = NaN;
  let nocolor = NaN;
  let trendstick = NaN;
  let nocolor_list = [NaN];
  let trendstick_list = [NaN];
  let nocolor_open = NaN;
  let nocolor_high = NaN;
  let nocolor_low = NaN;
  let nocolor_close = NaN;
  let nocolor_time=NaN;






  for (let i = 1; i < data.length; i++) {


    let d_open = Number(data[i].open);
    let d_close = (Number(data[i].close));
    if (d_close > d_open) {
      d_high = d_close;
    } else if (d_close < d_open) {
      d_high = d_open;
    } else {
      d_high = 1;
    }


    if (d_close > d_open) {
      d_low = d_open;
    } else if (d_close < d_open) {
      d_low = d_close;
    } else {
      d_low = 1;
    }

    if ((d_high_list.length > 1) && (!isNaN(d_high_list[d_high_list.length - 2])) && (d_low_list.length > 1) && !isNaN(d_low_list[d_low_list.length - 2])) {
      d_high = (d_high === 1) ? d_high_list[d_high_list.length - 1] : d_high;
      d_low = (d_low === 1) ? d_low_list[d_low_list.length - 1] : d_low;


      //h_open=low[1]
      h_open = Number(data[i - 1].low);
      h_close = Number(data[i].close);
      h_low = (h_close < h_open) ? h_close : h_open;
      h_high = Number(data[i - 1].high);
      h_dhigh = (h_close > h_high) ? h_close : h_high;


      if ((h_low_list.length > 1) && (!isNaN(h_low_list[h_low_list.length - 2])) && (h_dhigh_list.length > 1) && !isNaN(h_dhigh_list[h_dhigh_list.length - 2]))

        //dh_low =close<h_low[1]?close:h_low[1]
        dh_low = (Number(data[i].close) < h_low_list[h_low_list.length - 1]) ? Number(data[i].close) : h_low_list[h_low_list.length - 1]
      //nocolor:= ((close < h_dhigh[1]) and (close == dh_low))?dh_low:nocolor[1]
      dh_dhigh = (Number(data[i].close) > h_dhigh_list[h_dhigh_list.length - 1]) ? Number(data[i].close) : h_dhigh_list[h_dhigh_list.length - 1];

      if (((dh_dhigh_list.length > 1) && (!isNaN(dh_dhigh_list[dh_dhigh_list.length - 2]))) && ((dh_low_list.length > 1) && (!isNaN(dh_low_list[dh_low_list.length - 2])))) {
        nocolor = ((Number(data[i].close) < dh_dhigh_list[dh_dhigh_list.length - 1]) && (Number(data[i].close) === dh_low)) ? dh_low : ((Number(data[i].close) > dh_low_list[dh_low_list.length - 1]) && (Number(data[i].close) === dh_dhigh)) ? dh_dhigh : nocolor//nocolor_list[nocolor_list.length-1];
        //dh_dhigh=close>h_dhigh[1]?close:h_dhigh[1]
        //dh_dhigh=(Number(data[i].close) > h_dhigh_list[h_dhigh_list.length -1 ])?Number(data[i].close):h_dhigh_list[h_dhigh_list.length -1 ];

        if ((nocolor_list.length > 1) && (!isNaN(nocolor_list[nocolor_list.length - 2]))) {

          //ncolor_open= nocolor[1]
          nocolor_open = nocolor_list[nocolor_list.length - 1];
          //ncolor_close = nocolor
          nocolor_close = nocolor;
          //ncolor_low =ncolor_close > ncolor_open?ncolor_open:ncolor_close
          nocolor_low = (nocolor_close > nocolor_open) ? nocolor_open : nocolor_close;
          //ncolor_high =ncolor_close > ncolor_open?ncolor_close:ncolor_open
          nocolor_high = (nocolor_close > nocolor_open) ? nocolor_close : nocolor_open;

          //trendsticks:=ncolor_open != ncolor_close ? ncolor_low:trendsticks[1]
          trendstick = (nocolor_open != nocolor_close) ? nocolor_low : trendstick_list[trendstick_list.length - 1]
          nocolor_time=data[i].time;
        }
      }
    }
    dh_dhigh_list.push(dh_dhigh);
    dh_low_list.push(dh_low);
    trendstick_list.push(trendstick);
    nocolor_list.push(nocolor);
    h_low_list.push(h_low);
    h_dhigh_list.push(h_dhigh);
    d_low_list.push(d_low);
    d_high_list.push(d_high);
  }



  return { open: nocolor_open, high: nocolor_high, low: nocolor_low, close: nocolor_close,trend:trendstick ,time:nocolor_time}
}



// Create a WebSocket server on port 3000
const wss = new WebSocket.Server({ port:8080 });

// Subscribe to the WebSocket stream for Kline data
binanceWS.candles(symbol, interval, (candle) => {
  // Log the received Kline data
  //console.log('Kline Data:', candle);
  if (candle.isFinal === true) {
    t = candle.startTime;


    candles_dicts.push({ open: Number(candle.open), high: Number(candle.high), low: Number(candle.low), close: Number(candle.close )})
if (candles_dicts.length > 1){
  
    if (g=== false){   
      if (new_candles === false) {
        new_candle_sticks.push({ open: candles_dicts[candles_dicts.length - 2].close, high: Math.max(Number(candle.high), candles_dicts[candles_dicts.length - 2].close), low: Math.min(Number(candle.low), candles_dicts[candles_dicts.length - 2].close), close: Number(candle.close )})
      } else {
        new_candle_sticks.push({ open: new_candle_sticks[new_candle_sticks.length - 1].close, high: Math.max(Number(candle.high), new_candle_sticks[new_candle_sticks.length - 1].close), low: Math.min(Number(candle.low), new_candle_sticks[new_candle_sticks.length - 1].close), close: Number(candle.close )})
      }
     

      if (new_candle_sticks.length > 1) {
        new_candles = true;
        if (new_candle_sticks[new_candle_sticks.length - 2].close > new_candle_sticks[new_candle_sticks.length - 2].open) {

            if ((new_candle_sticks[new_candle_sticks.length - 1].close > new_candle_sticks[new_candle_sticks.length - 2].close) || (new_candle_sticks[new_candle_sticks.length - 1].close < new_candle_sticks[new_candle_sticks.length - 2].open)) {
        
                chart_dict.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) });
            }else if(new_candle_sticks[new_candle_sticks.length - 1].close == new_candle_sticks[new_candle_sticks.length-2].close){
              new_candle_sticks[new_candle_sticks.length - 1] = new_candle_sticks[new_candle_sticks.length - 2];
            
          }else {
              chart_dict.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) });
              side_way.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) })
              new_candle_sticks[new_candle_sticks.length - 1] = new_candle_sticks[new_candle_sticks.length - 2]
              
              g=true;
            }
        } 
        if (new_candle_sticks[new_candle_sticks.length - 2].close < new_candle_sticks[new_candle_sticks.length - 2].open) {
        
            if ((new_candle_sticks[new_candle_sticks.length - 1].close < new_candle_sticks[new_candle_sticks.length - 2].close) || (new_candle_sticks[new_candle_sticks.length - 1].close > new_candle_sticks[new_candle_sticks.length - 2].open)) {
        
                //final_candles.push(Number(new_candle_sticks[new_candle_sticks.length - 1].close))
        
                chart_dict.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) });
        
            }else if(new_candle_sticks[new_candle_sticks.length - 1].close == new_candle_sticks[new_candle_sticks.length-2].close){
              new_candle_sticks[new_candle_sticks.length - 1] = new_candle_sticks[new_candle_sticks.length - 2];
            
          } else {
              
              chart_dict.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) });
              side_way.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) })
              new_candle_sticks[new_candle_sticks.length - 1] = new_candle_sticks[new_candle_sticks.length - 2]
              
              g=true;
            }
        } 

       


        
        
      }

}else{
  new_candle_sticks.push({ open: side_way[side_way.length-1].close, high: Math.max(Number(candle.high), side_way[side_way.length-1].close), low: Math.min(Number(candle.low), side_way[side_way.length-1].close), close: Number(candle.close )});

  side_way.push({open:side_way[side_way.length-1].close,high:Math.max(Number(candle.high),side_way[side_way.length-1].close),low:Math.min(Number(candle.low),side_way[side_way.length-1].close),close:Number(candle.close)})

if (new_candle_sticks[new_candle_sticks.length - 2].close > new_candle_sticks[new_candle_sticks.length - 2].open) {

        if ((new_candle_sticks[new_candle_sticks.length - 1].close > new_candle_sticks[new_candle_sticks.length - 2].close) || (new_candle_sticks[new_candle_sticks.length - 1].close < new_candle_sticks[new_candle_sticks.length - 2].open)) {
        
              chart_dict.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) });
            g=false;
            }else{
              if ((side_way[side_way.length-2].close < side_way[side_way.length-2].open) && (side_way[side_way.length-1].close < side_way[side_way.length-2].close)){
                //chart_dict.push(side_way[side_way.length-1]);
                chart_dict.push({ time: t / 1000, open: Number(side_way[side_way.length - 1].open), high:Number(side_way[side_way.length - 1].high), low: Number(side_way[side_way.length - 1].low), close: Number(side_way[side_way.length - 1].close) });

              }else{
                side_way[side_way.length-1]=side_way[side_way.length-2];
                new_candle_sticks[new_candle_sticks.length - 1]=new_candle_sticks[new_candle_sticks.length - 2]

              }

            }
        }
if (new_candle_sticks[new_candle_sticks.length - 2].close < new_candle_sticks[new_candle_sticks.length - 2].open) {
        
            if ((new_candle_sticks[new_candle_sticks.length - 1].close < new_candle_sticks[new_candle_sticks.length - 2].close) || (new_candle_sticks[new_candle_sticks.length - 1].close > new_candle_sticks[new_candle_sticks.length - 2].open)) {
        
                //final_candles.push(Number(new_candle_sticks[new_candle_sticks.length - 1].close))
        
                chart_dict.push({ time: t / 1000, open: Number(new_candle_sticks[new_candle_sticks.length - 1].open), high: Number(new_candle_sticks[new_candle_sticks.length - 1].high), low: Number(new_candle_sticks[new_candle_sticks.length - 1].low), close: Number(new_candle_sticks[new_candle_sticks.length - 1].close) });
        g=false;
            }else{

              if ((side_way[side_way.length-2].close > side_way[side_way.length-2].open) && (side_way[side_way.length-1].close > side_way[side_way.length-2].close)){
                //chart_dict.push(side_way[side_way.length-1]);
                chart_dict.push({ time: t / 1000, open: Number(side_way[side_way.length - 1].open), high:Number(side_way[side_way.length - 1].high), low: Number(side_way[side_way.length - 1].low), close: Number(side_way[side_way.length - 1].close) });
              }else{
                side_way[side_way.length-1]=side_way[side_way.length-2];
                new_candle_sticks[new_candle_sticks.length - 1]=new_candle_sticks[new_candle_sticks.length - 2]


              }
              
            }
        } 

}

///second_part
const lastDict = chart_dict[Object.keys(chart_dict).pop()];
if (lastDict && Object.keys(lastDict).length > 0 && Object.values(lastDict).every(val => val !== undefined && !isNaN(val))) {
  
                 
          
    if (f==false){
        prev_dict=lastDict;
        f=true;
       }else{
        if (deepEqual(prev_dict,lastDict)){
          prev_dict=prev_dict;
  
        }else{
  
        if (((prev_dict.close <prev_dict.open) && (lastDict.close > lastDict.open)) || ((prev_dict.close > prev_dict.open) && (lastDict.close < lastDict.open)) ){
            no_p+=1;
            
            if (no_p >1){
              
              trend_list.push({time:d_tyme,open:d_open,high:d_high,low:d_low,close:lastDict.open})
              
            }
            d_open=lastDict.open;
            d_high=lastDict.high;
            d_low=lastDict.low;
            d_close=lastDict.close;
            d_tyme=lastDict.time;
        }else{
          if (no_p>=1){
            d_high=Math.max(d_high,lastDict.high);
            d_low=Math.min(d_low,lastDict.low);
          }
  
        }
        prev_dict=lastDict;
      }
       }
  
  
    //wss.clients.forEach(client => client.send(JSON.stringify(chart_dict)));
}//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

const lastD = chart_dict[Object.keys(chart_dict).pop()];
if (lastD && Object.keys(lastD).length > 0 && Object.values(lastD).every(val => val !== undefined && !isNaN(val))) {
  
                 
          
    if (h==false){
        prev_d=lastD;
        h=true;
       }else{
        if (deepEqual(prev_d,lastD)){
          prev_d=prev_d;
  
        }else{

        //const first_d=d_hl_trendsticks_02(chart_dict);
       // //const lastd = chart_dict[Object.keys(chart_dict).pop()];
       // if (first_d&& Object.keys(first_d).length > 0 && Object.values(first_d).every(val => val !== undefined && !isNaN(val))){
        //let lineList = chart_dict.map(({ close }) => ({
        //  close
         // }));\
         tr=d_hl_trendsticks_02(chart_dict);
         //const las = tr[Object.keys(chart_dict).pop()];
        if (tr && Object.keys(tr).length > 0 && Object.values(tr).every(val => val !== undefined && !isNaN(val))) {
         
          final_can.push(tr.close);
          //console.log(first_dict);
          if (final_can.length > 3){
            first_c.push(tr);
            Vi=Var_Fun(final_can,2,1);
            hl=hl_di(final_can)
            
            c_h=ch_candle(first_c);
            //tr=d_hl_trendsticks_02(first_c);
            //first_c[first_c.length-1]["trend"]=tr["trend"];
            first_c[first_c.length-1]["ch"]=c_h;
            first_c[first_c.length-1]["hdl1"]=hl[hl.length -2];
                
            first_c[first_c.length-1]["hdl2"]=hl[hl.length -1];
              
            first_c[first_c.length-1]["ver1"]=Vi[Vi.length - 1];
                                     
            first_c[first_c.length-1]["ver2"]=Vi[Vi.length - 2];
            //console.log(first_c);
        } 
      
     // }

      }
        
        prev_d=lastD;
      }
       }
  
  
    //wss.clients.forEach(client => client.send(JSON.stringify(chart_dict)));
}


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
}

   // if (candles_dicts.length > 1) {
      //opened=candles_dicts[candles_dicts-2].c;
      

    //}
    //can_list.push(candle);
    // let newList = can_list.map(({ startTime,open, high, low, close }) => ({ startTime,open, high, low, close }));
    //let newList = can_list.map(({ startTime, open, high, low, close }) => ({ startTime, open, high, low, close }));
    //let lineList = can_list.map(({ startTime, hdl1 }) => ({
    // startTime,
    // value: hdl1
    // }));


    //}
    //}
    console.log(first_c)

  }

  // Send the raw Kline data to connected clients (frontend)
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(first_c));
    //client.send(JSON.stringify(candle));
  });
});

// Log WebSocket server status
wss.on('listening', () => {
  console.log('WebSocket server is running');
});

