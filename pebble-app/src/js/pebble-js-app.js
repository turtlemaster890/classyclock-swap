// GitHub Pages works for the static settings UI. Replace the placeholder below with
// your real repo URL before publishing, e.g.:
// https://your-user.github.io/classyclock/settings-app/settings.html
// For local development, you can still point at http://localhost:8000/settings-app/settings.html
var SERVER_HOST = 'https://turtlemaster890.github.io/classyclock-swap'
var SETTINGS_URL = SERVER_HOST + '/settings-app/settings.html'
var TIMELINE_URL = SERVER_HOST + '/timeline'

var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
var defaultSchedules = ['A', 'B', 'C', 'D'].map(function (letter) {
	return { 'day': letter, 'schedule': [ { 'start': '23:58', 'end': '23:59', 'subj': 'Edit schedule on phone' } ] }
})

function getSchedules () {
	var ls = localStorage.getItem('schedules')
	if (ls !== null) {
		var parsed = JSON.parse(ls)
		if (Array.isArray(parsed)) return parsed
		if (parsed && Array.isArray(parsed.schedules)) return parsed.schedules
	}
	return defaultSchedules
}

function hasLetterSchedules () {
	return getSchedules().some(function (entry) {
		return ['A', 'B', 'C', 'D'].indexOf(String(entry.day)) !== -1
	})
}

function getAutoWeekParity (d) {
	var anchor = new Date(2024, 8, 2) // Monday of the first known school week in this schedule system.
	var current = new Date(d)
	current.setHours(0, 0, 0, 0)
	anchor.setHours(0, 0, 0, 0)
	var diffDays = Math.floor((current.getTime() - anchor.getTime()) / 86400000)
	return Math.floor(diffDays / 7) % 2
}

function getWeekPattern () {
	var normalPattern = ['A', 'B', 'C', 'D']
	var altPattern = ['A', 'B', 'D', 'C']
	var autoParity = getAutoWeekParity(new Date())
	var compareTo = 0
	if (storageGetBool('weekParityToggle')) compareTo = 1
	return autoParity === compareTo ? normalPattern : altPattern
}

function getCurrentWeekLabel () {
	var pattern = getWeekPattern()
	var weekNumber = (pattern.join('') === 'ABCD') ? 1 : 2
	return 'Week ' + weekNumber + ' (' + pattern.join('') + ')'
}

function getScheduleForLabel (label) {
	var matching = getSchedules().filter(function (s) { return s.day == label })[0]
	return (matching || { schedule: [] }).schedule
}

function timeToMinutes (t) {
	var parts = String(t || '00:00').split(':')
	var hours = parseInt(parts[0], 10) || 0
	var minutes = parseInt(parts[1], 10) || 0
	return hours * 60 + minutes
}

function minutesToTime (minutes) {
	var total = Math.max(0, Math.floor(minutes))
	var hours = Math.floor(total / 60)
	var mins = total % 60
	return String('00' + hours).slice(-2) + ':' + String('00' + mins).slice(-2)
}

function getPeriodTimingConfig () {
	var defaults = {
		A: '08:00',
		B: '09:05',
		C: '10:30',
		D: '11:35'
	}
	var periodLength = parseInt(localStorage.getItem('periodLengthMinutes') || 60, 10) || 60
	var gapMinutes = parseInt(localStorage.getItem('periodGapMinutes') || 5, 10) || 5
	var periods = {}
	['A', 'B', 'C', 'D'].forEach(function (label) {
		var key = 'periodStartTime_' + label
		var value = localStorage.getItem(key)
		if (!value) value = localStorage.getItem('periodStartTime') || defaults[label]
		periods[label] = value || defaults[label]
	})
	return {
		periods: periods,
		length: periodLength,
		gap: gapMinutes
	}
}

function buildGeneratedPeriodSchedule (order) {
	var cfg = getPeriodTimingConfig()
	var schedule = []
	order.forEach(function (label) {
		var labelSchedule = getScheduleForLabel(label)
		if (!Array.isArray(labelSchedule)) return
		var startMinutes = timeToMinutes(cfg.periods[label] || '08:00')
		labelSchedule.forEach(function (entry, index) {
			if (!entry) return
			var offsetMinutes = index * (cfg.length + cfg.gap)
			var start = minutesToTime(startMinutes + offsetMinutes)
			var end = minutesToTime(startMinutes + offsetMinutes + cfg.length)
			schedule.push({ start: start, end: end, subj: entry.subj || label })
		})
	})
	return schedule
}

function getPeriodScheduleForToday () {
	var order = getWeekPattern()
	var generated = buildGeneratedPeriodSchedule(order)
	if (generated.length > 0) return generated
	var schedule = []
	order.forEach(function (label) {
		var labelSchedule = getScheduleForLabel(label)
		if (Array.isArray(labelSchedule)) {
			labelSchedule.forEach(function (entry) {
				schedule.push(entry)
			})
		}
	})
	return schedule
}

function getScheduleForToday () {
	if (hasLetterSchedules()) {
		var dayNumber = new Date().getDay() - 1
		if (dayNumber === -1) dayNumber = 6
		if (dayNumber > 4) return []
		return getPeriodScheduleForToday()
	}

	// Legacy fallback: different schedule each named weekday.
	var dayNumber = new Date().getDay() - 1
	var today = days[dayNumber == -1 ? days.length - 1 : dayNumber]
	return (getSchedules().filter(function (s) { return s.day == today })[0] || { schedule: [] }).schedule
}

function setSchedules (s) {
	return localStorage.setItem('schedules', JSON.stringify({ schedules: s }))
}

function formatTime (t) {
	// The Pebble app needs a zero-padded number of minutes
	var parts = t.split(':')
	var padded = ('0000' + String(parseInt(parts[0]) * 60 + parseInt(parts[1])))
	return padded.slice(padded.length - 4, padded.length)
}

function serializeSchedule (flat_schedule) {
	var result = {}
	var ctr = 1
	flat_schedule.forEach(function (entry) {
		result[String(ctr)] = formatTime(entry.start) + formatTime(entry.end) + entry.subj.slice(0, 160)
		ctr += 1
	})
	return result
}

function addSettings (message) {
	var INT_MAX = 2147483647
	message[String(INT_MAX - 1)]  = parseInt(localStorage.getItem('vibrateMinutes') || 1)
	message[String(INT_MAX - 10)] = parseInt((localStorage.getItem('colorBg')       || '#FFAAAA').slice(1), 16)
	message[String(INT_MAX - 11)] = parseInt((localStorage.getItem('colorClock')    || '#555500').slice(1), 16)
	message[String(INT_MAX - 12)] = parseInt((localStorage.getItem('colorDate')     || '#555500').slice(1), 16)
	message[String(INT_MAX - 13)] = parseInt((localStorage.getItem('colorTimer')    || '#555500').slice(1), 16)
	message[String(INT_MAX - 14)] = parseInt((localStorage.getItem('colorSubject')  || '#555500').slice(1), 16)
	message[String(INT_MAX - 15)] = getCurrentWeekLabel()
	message[String(INT_MAX - 16)] = storageGetBool('weekParityToggle') ? 1 : 0
	console.log('Message: ' + JSON.stringify(message))
	return message
}

function sendNextEvent () {
	Pebble.sendAppMessage(
		addSettings(serializeSchedule(getScheduleForToday())),
		function (e) {
			console.log('Successfully delivered message with transactionId=' + e.data.transactionId)
		},
		function (e) {
			console.log('Unable to deliver message with transactionId=' + e.data.transactionId + ' Error is: ' + e.error.message)
		}
	)
}

function storageGetBool (key) {
	try { return JSON.parse(localStorage.getItem(key)) == true } catch (e) { return false }
}

function syncAndSend () {
	sendNextEvent()
	if (storageGetBool('ruzEnabled') && localStorage.getItem('ruzLastUpdated') != formatDate(new Date()))
		fetchRuzSchedule()
	else // done in fetchRuzSchedule on load
		pushToTimeline(false)
}

function formatDate (d) {
	// toISOString converts to UTC!!
	return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
}

function fetchRuzSchedule () {
	var curr = new Date()
	var firstday = curr.getDate() - curr.getDay() + 1
	var fromdate = formatDate(new Date(curr.setDate(firstday))).replace('-', '.')
	var todate = formatDate(new Date(curr.setDate(firstday + 6))).replace('-', '.')

	var url = 'http://ruz.hse.ru/RUZService.svc/personlessons?' + 'fromdate=' + fromdate + '&todate=' + todate + '&email=' + localStorage.getItem('ruzEmail')
	console.log(url)
	var req = new XMLHttpRequest()
	req.open('GET', url, true)
	req.setRequestHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 5.1.1; One Build/LRX22C.H3) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/39.0.0.0 Mobile Safari/537.36')
	req.setRequestHeader('Accept', 'application/json, text/plain, */*')
	req.setRequestHeader('X-Requested-With', 'ru.hse.ruz')
	req.onload = function () {
		if (req.readyState !== 4 || req.status !== 200) {
			console.log('ruz error')
			pushToTimeline(false)
			return
		}
		var schedule = { 'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': [] }
		JSON.parse(req.responseText).forEach(function (entry) {
			schedule[days[entry.dayOfWeek - 1]].push({
				'start': entry.beginLesson,
				'end':   entry.endLesson,
				'subj':  entry.auditorium + ' ' + entry.discipline
			})
		})
		var result = days.map(function (dn) {
			return { 'day': dn, 'schedule': schedule[dn] }
		})
		console.log('ruz success')
		setSchedules(result)
		sendNextEvent()
		localStorage.setItem('ruzLastUpdated', formatDate(new Date()))
		pushToTimeline(true)
	}
	req.send(null)
}

function pushToTimeline (forceUpdate) {
	if (!storageGetBool('timelineEnabled')) { return }
	if (!forceUpdate && localStorage.getItem('timelineLastUpdated') == formatDate(new Date())) {
		console.log('Timeline already pushed at ' + localStorage.getItem('timelineLastUpdated'))
		return
	}
	Pebble.getTimelineToken(function (token) {
		var curr = new Date()
		var url = TIMELINE_URL + '?token=' + token + '&tz=' + curr.getTimezoneOffset() + '&date=' + formatDate(curr)
		console.log(url)
		var req = new XMLHttpRequest()
		req.open('POST', url, true)
		req.setRequestHeader('Content-Type', 'application/json')
		req.onload = function () {
			if (req.readyState !== 4 || req.status !== 200) {
				console.log('Timeline error')
				return
			}
			console.log('Timeline success')
			localStorage.setItem('timelineLastUpdated', formatDate(new Date()))
		}
		req.send(JSON.stringify(getScheduleForToday()))
	}, function (error) {
		console.log('Timeline token not available: ' + error)
	})
}

Pebble.addEventListener('ready', function (e) {
	console.log('READY. Event: ' + JSON.stringify(e) + ' Schedules: ' + JSON.stringify(getSchedules()))
	syncAndSend()
})

Pebble.addEventListener('appmessage', function (e) {
	console.log('APPMESSAGE. Event: ' + JSON.stringify(e))
	if (e.payload.get)
		syncAndSend()
})

Pebble.addEventListener('showConfiguration', function (e) {
	Pebble.openURL(SETTINGS_URL + '#' + encodeURIComponent(JSON.stringify({
		schedules:         getSchedules(),
		weekParityToggle:  storageGetBool('weekParityToggle'),
		periodStartTimeA:  localStorage.getItem('periodStartTime_A') || localStorage.getItem('periodStartTime') || '08:00',
		periodStartTimeB:  localStorage.getItem('periodStartTime_B') || localStorage.getItem('periodStartTime') || '09:05',
		periodStartTimeC:  localStorage.getItem('periodStartTime_C') || localStorage.getItem('periodStartTime') || '10:30',
		periodStartTimeD:  localStorage.getItem('periodStartTime_D') || localStorage.getItem('periodStartTime') || '11:35',
		periodLengthMinutes: parseInt(localStorage.getItem('periodLengthMinutes') || 60, 10),
		periodGapMinutes:  parseInt(localStorage.getItem('periodGapMinutes') || 5, 10),
		vibrateMinutes:    localStorage.getItem('vibrateMinutes'),
		ruzEmail:          localStorage.getItem('ruzEmail'),
		ruzEnabled:        storageGetBool('ruzEnabled'),
		timelineEnabled:   storageGetBool('timelineEnabled'),
		colorBg:           localStorage.getItem('colorBg'),
		colorClock:        localStorage.getItem('colorClock'),
		colorDate:         localStorage.getItem('colorDate'),
		colorTimer:        localStorage.getItem('colorTimer'),
		colorSubject:      localStorage.getItem('colorSubject'),
	})))
})

Pebble.addEventListener('webviewclosed', function (e) {
	var rsp = JSON.parse(decodeURIComponent(e.response))
	if (typeof rsp === 'object') {
		setSchedules(rsp.schedules)
		localStorage.setItem('weekParityToggle', JSON.stringify(rsp.weekParityToggle === true))
		if (rsp.periodStartTimeA) localStorage.setItem('periodStartTime_A', rsp.periodStartTimeA)
		if (rsp.periodStartTimeB) localStorage.setItem('periodStartTime_B', rsp.periodStartTimeB)
		if (rsp.periodStartTimeC) localStorage.setItem('periodStartTime_C', rsp.periodStartTimeC)
		if (rsp.periodStartTimeD) localStorage.setItem('periodStartTime_D', rsp.periodStartTimeD)
		if (rsp.periodLengthMinutes) localStorage.setItem('periodLengthMinutes', rsp.periodLengthMinutes)
		if (rsp.periodGapMinutes) localStorage.setItem('periodGapMinutes', rsp.periodGapMinutes)
		localStorage.setItem('vibrateMinutes', rsp.vibrateMinutes)
		localStorage.setItem('ruzEmail', rsp.ruzEmail)
		localStorage.setItem('ruzEnabled', JSON.stringify(rsp.ruzEnabled))
		localStorage.setItem('timelineEnabled', JSON.stringify(rsp.timelineEnabled))
		localStorage.setItem('colorBg', rsp.colorBg)
		localStorage.setItem('colorClock', rsp.colorClock)
		localStorage.setItem('colorDate', rsp.colorDate)
		localStorage.setItem('colorTimer', rsp.colorTimer)
		localStorage.setItem('colorSubject', rsp.colorSubject)
		sendNextEvent()
		if (rsp.ruzEnabled)
			fetchRuzSchedule()
		else
			pushToTimeline(true)
	}
})
