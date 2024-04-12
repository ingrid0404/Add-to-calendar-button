import { atcbIsMobile, atcbVersion,atcbDefaultTarget} from './constants';
 import { tzlib_get_offset, tzlib_get_ical_block} from 'timezones-ical-library';
 

const SEPARATOR = (navigator.appVersion.indexOf('Win') !== -1) ? '\r\n' : '\n';
const calendarEvents = [];
var calendarStart = [
  'BEGIN:VCALENDAR',
  'RRULE:FREQ=YEARLY',
  'PRODID:' + 1,
  'VERSION:2.0'
].join(SEPARATOR);
const calendarEnd = SEPARATOR + 'END:VCALENDAR';
export const generateICSFile = (title, location, startDate, endDate) => {
    const calendarEvent = [
        'BEGIN:VEVENT',
        'CLASS:PUBLIC',
        'DTSTART;VALUE=DATE-TIME:' + startDate,
        'DTEND;VALUE=DATE-TIME:' + endDate,
        'LOCATION:' + location,
        'SUMMARY;LANGUAGE=en-us:' + title,
        'TRANSP:TRANSPARENT',
        'END:VEVENT'
      ];

    const toReturn = calendarStart + SEPARATOR + calendarEvent.join(SEPARATOR) + calendarEnd;
        
      console.log(toReturn);
      return toReturn; 
    }

    
function atcb_format_datetime(datetime, style = 'delimiters', includeTime = true, removeZ = false) {
  const regex = (function () {
    // defines what gets cut off
    if (includeTime) {
      if (style === 'clean') {
        return /(-|:|(\.\d{3}))/g;
      }
      return /(\.\d{3})/g;
    }
    if (style === 'clean') {
      return /(-|T(\d{2}:\d{2}:\d{2}\.\d{3})Z)/g;
    }
    return /T(\d{2}:\d{2}:\d{2}\.\d{3})Z/g;
  })();
  const output = removeZ ? datetime.toISOString().replace(regex, '').replace('Z', '') : datetime.toISOString().replace(regex, '');
  return output;
}


    // SHARED FUNCTION TO GENERATE A TIME STRING
function atcb_generate_time(data, style = 'delimiters', targetCal = 'general', addTimeZoneOffset = false) {
  if (data.startTime && data.startTime !== '' && data.endTime && data.endTime !== '') {
    // for the input, we assume GMT/UTC per default
    const newStartDate = new Date(data.startDate + 'T' + data.startTime + ':00.000+00:00');
    // we re-adjust the endDate for the case where the time string generation gets rather called directly
    if (!data.endDate) data.endDate = data.startDate;
    const newEndDate = new Date(data.endDate + 'T' + data.endTime + ':00.000+00:00');
    const durationMS = newEndDate - newStartDate;
    const durationHours = Math.floor(durationMS / 1000 / 60 / 60);
    const durationMinutes = Math.floor(((durationMS - durationHours * 60 * 60 * 1000) / 1000 / 60) % 60);
    const durationString = (function () {
      if (durationHours < 10) {
        return '0' + durationHours + ':' + ('0' + durationMinutes).slice(-2);
      }
      return durationHours + ':' + ('0' + durationMinutes).slice(-2);
    })();
    // (see https://tz.add-to-calendar-technology.com/api/zones.json for available TZ names)
    if (targetCal === 'ical' || (targetCal === 'google' && !/(GMT[+|-]\d{1,2}|Etc\/U|Etc\/Zulu|CET|CST6CDT|EET|EST|EST5EDT|MET|MST|MST7MDT|PST8PDT|WET)/i.test(data.timeZone))) {
      // in the iCal case, we simply return and cut off the Z. Same applies to Google, except for GMT +/- time zones, which are not supported there.
      // everything else will be done by injecting the VTIMEZONE block at the iCal function
      return {
        start: atcb_format_datetime(newStartDate, 'clean', true, true),
        end: atcb_format_datetime(newEndDate, 'clean', true, true),
        duration: durationString,
        allday: false,
      };
    }
    // we get the correct offset via the timeZones iCal Library
    const offsetStart = tzlib_get_offset(data.timeZone, data.startDate, data.startTime);
    const offsetEnd = tzlib_get_offset(data.timeZone, data.endDate, data.endTime);
    // if we need to add the offset to the datetime string, do so respectively
    if (addTimeZoneOffset) {
      const formattedOffsetStart = offsetStart.slice(0, 3) + ':' + offsetStart.slice(3);
      const formattedOffsetEnd = offsetEnd.slice(0, 3) + ':' + offsetEnd.slice(3);
      return {
        start: newStartDate.toISOString().replace('.000Z', formattedOffsetStart),
        end: newEndDate.toISOString().replace('.000Z', formattedOffsetEnd),
        duration: durationString,
        allday: false,
      };
    }
    // in other cases, we substract the offset from the dates
    // (substraction to reflect the fact that the user assumed his timezone and to convert to UTC; since calendars assume UTC and add offsets again)
    const calcOffsetStart = parseInt(offsetStart[0] + 1) * -1 * ((parseInt(offsetStart.substring(1, 3)) * 60 + parseInt(offsetStart.substring(3, 5))) * 60 * 1000);
    const calcOffsetEnd = parseInt(offsetEnd[0] + 1) * -1 * ((parseInt(offsetEnd.substring(1, 3)) * 60 + parseInt(offsetEnd.substring(3, 5))) * 60 * 1000);
    newStartDate.setTime(newStartDate.getTime() + calcOffsetStart);
    newEndDate.setTime(newEndDate.getTime() + calcOffsetEnd);
    // return formatted data
    return {
      start: atcb_format_datetime(newStartDate, style),
      end: atcb_format_datetime(newEndDate, style),
      duration: durationString,
      allday: false,
    };
  } else {
    // would be an allday event then
    const startDate = data.startDate.split('-');
    const endDate = data.endDate ? data.endDate.split('-') : startDate;
    // we set 12 o clock as time to prevent Daylight saving time to interfere with any calculation here
    const newStartDate = new Date(Date.UTC(startDate[0], startDate[1] - 1, startDate[2], 12, 0, 0));
    const newEndDate = new Date(Date.UTC(endDate[0], endDate[1] - 1, endDate[2], 12, 0, 0));
    // increment the end day by 1 for Google Calendar, iCal, and Microsoft (but only if mobile, since desktop does not need this)
    // TODO: remove Microsoft from this list as soon as they fixed their bugs
    if (targetCal === 'google' || (targetCal === 'microsoft' && !atcbIsMobile()) || targetCal === 'msteams' || targetCal === 'ical') {
      newEndDate.setDate(newEndDate.getDate() + 1);
    }
    // return formatted data
    // for ms teams, we need to remove the Z as well and add the time zone offset +00:00 instead
    // but only on desktop - on mobile devices, we add time information in the user's time zone
    // TODO: optimize this as soon as Microsoft fixed their bugs
    if (targetCal === 'msteams') {
      if (atcbIsMobile()) {
        // get the time zone offset of the user's browser for the start date
        const offset = newStartDate.getTimezoneOffset();
        // get the ISO string of the offset
        const formattedOffset = (function () {
          if (offset < 0) {
            return '+' + ('0' + Math.abs(offset / 60)).slice(-2) + ':' + ('0' + Math.abs(offset % 60)).slice(-2);
          } else {
            return '-' + ('0' + Math.abs(offset / 60)).slice(-2) + ':' + ('0' + Math.abs(offset % 60)).slice(-2);
          }
        })();
        // return formatted data
        return {
          start: atcb_format_datetime(newStartDate, style, false, true) + 'T00:00:00' + formattedOffset,
          end: atcb_format_datetime(newEndDate, style, false, true) + 'T00:00:00' + formattedOffset,
          allday: true,
        };
      }
      return {
        start: atcb_format_datetime(newStartDate, style, false, true) + '+00:00',
        end: atcb_format_datetime(newEndDate, style, false, true) + '+00:00',
        allday: true,
      };
    }
    // for all others, it is easier
    return {
      start: atcb_format_datetime(newStartDate, style, false),
      end: atcb_format_datetime(newEndDate, style, false),
      allday: true,
    };
  }
}



    // FUNCTION TO GENERATE THE iCAL FILE (also for apple - see above)
// See specs at: https://www.rfc-editor.org/rfc/rfc5545.html
export function atcb_generate_ical( data, subEvent = 'all',) {
  if (subEvent !== 'all') {
    subEvent = parseInt(subEvent);
  }
  // define the right filename
  const filename = data.name;
  
  // if we are in proxy mode, we can directly redirect
  if (data.proxy) {
   // atcb_open_cal_url(data, 'ical', 'https://add-to-calendar-pro.com', false, subEvent);
    return;
  }
  // else, we directly load it (not if iOS and WebView - will be catched further down - except it is explicitely bridged)
  /*
  if ((!atcbIsiOS() || !atcbIsWebView() || data.bypassWebViewCheck)) {
    atcb_save_file(givenIcsFile, filename);
    return;
  }
  */
  // otherwise, generate one on the fly
  const now = new Date();
  const ics_lines = ['BEGIN:VCALENDAR', 'VERSION:2.0'];
  ics_lines.push('PRODID:-// https://add-to-calendar-pro.com // button v' + atcbVersion + ' //EN');
  ics_lines.push('CALSCALE:GREGORIAN');
  // we set CANCEL, whenever the status says so
  // mind that in the multi-date case (where we create 1 ics file), it will always be PUBLISH
  
    ics_lines.push('METHOD:PUBLISH');
  
  const usedTimeZones = [];

    const formattedDate = atcb_generate_time(data, 'clean', 'ical');
    // get the timezone addon string for dates and include time zone information, if set and if not allday (not necessary in that case)
    const timeAddon = (function () {
      if (formattedDate.allday) {
        return ';VALUE=DATE';
      }
      if (data.timeZone && data.timeZone !== '') {
        const timeZoneBlock = tzlib_get_ical_block(data.timeZone);
        if (!usedTimeZones.includes(data.timeZone)) {
          ics_lines.push(timeZoneBlock[0]);
        }
        usedTimeZones.push(data.timeZone);
        return ';' + timeZoneBlock[1];
      }
    })();
    ics_lines.push('BEGIN:VEVENT');
    if (data.uid && data.uid !== '') {
      ics_lines.push('UID:' + data.uid);
    }
    ics_lines.push('DTSTAMP:' + atcb_format_datetime(now, 'clean', true));
    ics_lines.push('DTSTART' + timeAddon + ':' + formattedDate.start);
    ics_lines.push('DTEND' + timeAddon + ':' + formattedDate.end);
    ics_lines.push('SUMMARY:' + atcb_rewrite_ical_text(data.name, true));
    if (data.location && data.location !== '') {
      ics_lines.push('LOCATION:' + atcb_rewrite_ical_text(data.location, true));
    }
    
    ics_lines.push('SEQUENCE:' + data.sequence);
    ics_lines.push('STATUS:' + data.status);
    ics_lines.push('CREATED:' + data.created);
    ics_lines.push('LAST-MODIFIED:' + data.updated);
    ics_lines.push('END:VEVENT');
  
  ics_lines.push('END:VCALENDAR');
  const dataUrl = (function () {
    // otherwise, we generate it from the array
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics_lines.join('\r\n'));
  })();
  // in in-app browser cases (WebView), we offer a copy option, since the on-the-fly client side generation is usually not supported
  // for Android, we are more specific than with iOS and only go for specific apps at the moment
  // for Chrome on iOS we basically do the same
 /*
  if ((atcbIsiOS() && !atcbIsSafari()) || (atcbIsWebView() && (atcbIsiOS() || (atcbIsAndroid() && atcbIsProblematicWebView())))) {
    atcb_ical_copy_note(host, dataUrl, data, keyboardTrigger);
    return;
  }
  */
  // save the file dialog in all other cases
  console.log(dataUrl);
  //https://outlook.live.com/mail/0/deeplink/compose?to=your@email.com

  // atcb_open_cal_url(data, 'google', urlParts.join('&'), false, subEvent);

  const urlParts = [];
  const basePath = (function () {
    // tmp workaround to reflect the fact that Microsoft is routing mobile traffic differently
    // TODO: remove this, when Microsoft has fixed this
    if (atcbIsMobile() || data.fakeMobile) {
      return '/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent';
    }
    return '/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent';
    
    //return '/calendar/action/compose?rru=addevent';
  })();
  const baseUrl = (function () {
    //return 'https://outlook.office.com'+basePath;
      return 'https://outlook.live.com' + basePath;
    
  })();
  urlParts.push(baseUrl);
  // generate and add date
  urlParts.push('startdt=' + formattedDate.start);
  urlParts.push('enddt=' + formattedDate.end);
  if (formattedDate.allday) {
    urlParts.push('allday=true');
  }
  // add details (if set)
  if (data.name != null && data.name !== '') {
    // for the name, we need to replace any ampersand in the name, as Microsoft does not parse it correctly
    // TODO: remove this, when Microsoft has fixed this
    urlParts.push('subject=' + encodeURIComponent(data.name.replace(/&/g, '&#xFF06;')));
  }
  if (data.location != null && data.location !== '') {
    urlParts.push('location=' + encodeURIComponent(data.location));
  }
  atcb_open_cal_url(data, 'outlookcom', urlParts.join('&'), false, subEvent);

  atcb_save_file(dataUrl, filename);
}

// SHARED FUNCTION TO SECURE URLS
function atcb_secure_url(url, throwError = true) {
  if (url && url.match(/((\.\.\/)|(\.\.\\)|(%2e%2e%2f)|(%252e%252e%252f)|(%2e%2e\/)|(%252e%252e\/)|(\.\.%2f)|(\.\.%252f)|(%2e%2e%5c)|(%252e%252e%255c)|(%2e%2e\\)|(%252e%252e\\)|(\.\.%5c)|(\.\.%255c)|(\.\.%c0%af)|(\.\.%25c0%25af)|(\.\.%c1%9c)|(\.\.%25c1%259c))/gi)) {
    if (throwError) {
      console.error('Seems like the generated URL includes at least one security issue and got blocked. Please check the calendar button parameters!');
    }
    return false;
  } else {
    return true;
  }
}
// FUNCTION TO OPEN THE URL
function atcb_open_cal_url(data, type, url, 
  subscribe = false, subEvent = null, target = '') {
  if (target === '') {
    target = atcbDefaultTarget;
  }
  if (atcb_secure_url(url)) {
    if (data.proxy && data.proKey && data.proKey !== '') {
      const urlType = subscribe ? 's' : 'o';
      const query = (function () {
        const parts = [];
        if (data.attendee && data.attendee !== '') {
          parts.push('attendee=' + encodeURIComponent(data.attendee));
        }
        if (data.customVar && typeof data.customVar === 'object' 
        && Object.keys(data.customVar).length > 0) {
          parts.push('customvar=' + encodeURIComponent(JSON.stringify(data.customVar)));
        }
        if (data.dates && data.dates.length > 1 && subEvent !== null && subEvent !== 'all') {
          parts.push('sub-event=' + subEvent);
        }
        if (parts.length > 0) {
          return '?' + parts.join('&');
        }
        return '';
      })();
      url = (data.dev ? 'https://dev.caldn.net/' : 'https://caldn.net/') + data.proKey + '/' + urlType + '/' + type + query;
      if (!atcb_secure_url(url)) {
        return;
      }
    }
    //const ceva = 'ms-outlook://events/new?title=MY%20MEETING&start=2019-01-29T13:00:00&end=2019-01-29T14:00:00&location=LOCATION&attendees=some.person@email.com';
    //const newTab = window.open(url, target);
    //const cevaOutlook = 'https://outlook.live.com/owa/0/?path=/classic';
    // return '/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent';
    
    const newTab = window.open(url, target);
    
    if (newTab) {
      newTab.focus();
    }
  }
}

// SHARED FUNCTION TO SAVE A FILE
function atcb_save_file(file, filename) {
  try {
    const save = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    save.rel = 'noopener';
    save.href = file;
    // not using default target here, since this needs to happen _self on iOS (abstracted to mobile in general) and _blank at Firefox (abstracted to other setups) due to potential cross-origin restrictions
    if (atcbIsMobile()) {
      save.target = '_self';
    } else {
      save.target = '_blank';
    }
    save.download = filename + '.ics';
    const evt = new MouseEvent('click', {
      view: window,
      button: 0,
      bubbles: true,
      cancelable: false,
    });
    save.dispatchEvent(evt);
    (window.URL || window.webkitURL).revokeObjectURL(save.href);
  } catch (e) {
    console.error(e);
  }
}

// SHARED FUNCTION TO FORMAT iCAL TEXT
function atcb_rewrite_ical_text(content, truncate = true, inQuotes = false) {
  if (inQuotes) {
    content = content.replace(/"/g, '');
  } else {
    content = content.replace(/\\/g, '\\\\').replace(/(,|;)/g, '\\$1').replace(/\\\\n/g, '\\n');
  }
  if (truncate) {
    // adjusting for intended line breaks + making sure it does not exceed 75 characters per line
    content = content.replace(/.{60}/g, '$&' + '\r\n ');
  }
  return content;
}
