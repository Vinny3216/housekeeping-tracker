import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  // form inputs
  const [workDate, setWorkDate] = useState('')
  const [checkoutRooms, setCheckoutRooms] = useState('')
  const [stayoverRooms, setStayoverRooms] = useState('')
  const [inTimeInput, setInTimeInput] = useState('')
  const [outTimeInput, setOutTimeInput] = useState('')
  const [breakHours, setBreakHours] = useState('0.5')
  const [note, setNote] = useState('')

  // calculated results
  const [totalHours, setTotalHours] = useState(null)
  const [rph, setRph] = useState(null)

  // history
  const [records, setRecords] = useState([])

  // stats
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [hourlyRate, setHourlyRate] = useState('16.5')
  const [stats, setStats] = useState(null)

  // page
  const [currentPage, setCurrentPage] = useState('form')

  // edit mode
  const [editingId, setEditingId] = useState(null)

  // history month expand
  const [expandedMonth, setExpandedMonth] = useState(null)

  // tools
  const [activeTool, setActiveTool] = useState('estimator')

  // estimator
  const [estCheckout, setEstCheckout] = useState('')
  const [estStayover, setEstStayover] = useState('')
  const [estInTime, setEstInTime] = useState('')
  const [estBreak, setEstBreak] = useState('0.5')
  const [estOutTime, setEstOutTime] = useState('')
  const [estTargetRph, setEstTargetRph] = useState('')
  const [estMode, setEstMode] = useState('outtime')
  const [estResult, setEstResult] = useState(null)

  // break timer
  const [breakStartTime, setBreakStartTime] = useState('')
  const [breakDuration, setBreakDuration] = useState('30')
  const [breakEndResult, setBreakEndResult] = useState(null)

  // schedule
  const [schedules, setSchedules] = useState([])
  const [scheduleMonth, setScheduleMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // load data on mount
  useEffect(() => {
    fetchRecords()
    fetchSchedules()
  }, [])

  function parseTimeInput(val) {
    const num = val.replace(/[^0-9]/g, '')
    if (num.length <= 2) return null
    if (num.length === 3) {
      return { hour: parseInt(num[0]), minute: parseInt(num.slice(1)), display: num[0] + ':' + num.slice(1) }
    }
    if (num.length >= 4) {
      return { hour: parseInt(num.slice(0, 2)), minute: parseInt(num.slice(2, 4)), display: num.slice(0, 2) + ':' + num.slice(2, 4) }
    }
    return null
  }

  function toDbTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  function formatTime12(time24) {
    if (!time24) return ''
    const parts = time24.split(':')
    let h = parseInt(parts[0])
    const m = parts[1]
    if (h === 0) return `12:${m} AM`
    if (h < 12) return `${h}:${m} AM`
    if (h === 12) return `12:${m} PM`
    return `${h - 12}:${m} PM`
  }

  async function fetchRecords() {
    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .order('work_date', { ascending: false })
    if (!error) setRecords(data)
  }

  async function fetchSchedules() {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('work_date', { ascending: true })
    if (!error) setSchedules(data)
  }

  function calculate() {
    const inParsed = parseTimeInput(inTimeInput)
    const outParsed = parseTimeInput(outTimeInput)

    if (!inParsed || !outParsed || !checkoutRooms || !stayoverRooms) {
      alert('Please fill in all fields. Time format: 813 = 8:13, 1435 = 14:35')
      return
    }

    if (inParsed.minute > 59 || outParsed.minute > 59 || inParsed.hour > 23 || outParsed.hour > 23) {
      alert('Invalid time. Hours 0-23, minutes 0-59.')
      return
    }

    const inDecimal = inParsed.hour + inParsed.minute / 60
    const outDecimal = outParsed.hour + outParsed.minute / 60
    const breakVal = parseFloat(breakHours) || 0
    const total = outDecimal - inDecimal - breakVal

    if (total <= 0) {
      alert('Total hours must be greater than 0. Check your times.')
      return
    }

    const rooms = parseInt(checkoutRooms) + parseInt(stayoverRooms)
    const rphVal = rooms / total

    setTotalHours(Math.round(total * 100) / 100)
    setRph(Math.round(rphVal * 100) / 100)
  }

  async function saveRecord() {
    if (totalHours === null || rph === null) {
      alert('Please calculate first')
      return
    }

    const inParsed = parseTimeInput(inTimeInput)
    const outParsed = parseTimeInput(outTimeInput)

    const record = {
      work_date: workDate,
      checkout_rooms: parseInt(checkoutRooms),
      stayover_rooms: parseInt(stayoverRooms),
      in_time: toDbTime(inParsed.hour, inParsed.minute),
      out_time: toDbTime(outParsed.hour, outParsed.minute),
      break_hours: parseFloat(breakHours),
      total_hours: totalHours,
      rph: rph,
      note: note
    }

    let error
    if (editingId) {
      const result = await supabase.from('work_records').update(record).eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase.from('work_records').insert([record])
      error = result.error
    }

    if (error) {
      alert('Error saving: ' + error.message)
    } else {
      alert(editingId ? 'Updated!' : 'Saved!')
      clearForm()
      fetchRecords()
    }
  }

  function clearForm() {
    setWorkDate('')
    setCheckoutRooms('')
    setStayoverRooms('')
    setInTimeInput('')
    setOutTimeInput('')
    setBreakHours('0.5')
    setNote('')
    setTotalHours(null)
    setRph(null)
    setEditingId(null)
  }

  async function deleteRecord(id) {
    if (!window.confirm('Are you sure you want to delete this record?')) return
    const { error } = await supabase.from('work_records').delete().eq('id', id)
    if (!error) fetchRecords()
  }

  function editRecord(record) {
    setWorkDate(record.work_date)
    setCheckoutRooms(String(record.checkout_rooms))
    setStayoverRooms(String(record.stayover_rooms))
    const inParts = record.in_time.split(':')
    setInTimeInput(String(parseInt(inParts[0])) + inParts[1])
    const outParts = record.out_time.split(':')
    setOutTimeInput(String(parseInt(outParts[0])) + outParts[1])
    setBreakHours(String(record.break_hours))
    setNote(record.note || '')
    setTotalHours(record.total_hours)
    setRph(record.rph)
    setEditingId(record.id)
    setCurrentPage('form')
  }

  function calculateStats() {
    if (!startDate || !endDate) { alert('Please select start and end dates'); return }
    const filtered = records.filter(r => r.work_date >= startDate && r.work_date <= endDate)
    if (filtered.length === 0) { alert('No records found in this date range'); return }
    const totalDays = filtered.length
    const totalWorkHours = filtered.reduce((sum, r) => sum + r.total_hours, 0)
    const avgHoursPerDay = totalWorkHours / totalDays
    const rate = parseFloat(hourlyRate) || 0
    const grossPay = totalWorkHours * rate
    setStats({
      totalDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      avgHoursPerDay: Math.round(avgHoursPerDay * 100) / 100,
      grossPay: Math.round(grossPay * 100) / 100
    })
  }

  function timePreview(val) {
    const parsed = parseTimeInput(val)
    if (!parsed) return ''
    if (parsed.minute > 59 || parsed.hour > 23) return 'Invalid'
    return formatTime12(toDbTime(parsed.hour, parsed.minute))
  }

  function calculateStandard() {
    const inParsed = parseTimeInput(estInTime)
    if (!inParsed || !estCheckout || !estStayover) { alert('Please fill in In Time, C/O and S/O'); return }
    const coNum = parseInt(estCheckout)
    const soNum = parseInt(estStayover)
    const breakVal = parseFloat(estBreak) || 0
    const totalRooms = coNum + soNum
    const standardMinutes = coNum * 40 + soNum * 20
    const standardHours = standardMinutes / 60
    const inTotalMinutes = inParsed.hour * 60 + inParsed.minute
    const outTotalMinutes = inTotalMinutes + standardMinutes + breakVal * 60
    const outHour = Math.floor(outTotalMinutes / 60)
    const outMinute = Math.round(outTotalMinutes % 60)
    const standardRph = totalRooms / standardHours
    let compare = null
    if (estMode === 'outtime' && estOutTime) {
      const outParsed = parseTimeInput(estOutTime)
      if (outParsed) {
        const actualWorkHours = (outParsed.hour + outParsed.minute / 60) - (inParsed.hour + inParsed.minute / 60) - breakVal
        if (actualWorkHours > 0) {
          compare = {
            workHours: Math.round(actualWorkHours * 100) / 100,
            rph: Math.round((totalRooms / actualWorkHours) * 100) / 100,
            rphDiff: Math.round(((totalRooms / actualWorkHours) - standardRph) * 100) / 100,
            minutesDiff: Math.round((actualWorkHours - standardHours) * 60)
          }
        }
      }
    }
    if (estMode === 'rph' && estTargetRph) {
      const targetRph = parseFloat(estTargetRph)
      if (targetRph > 0) {
        const neededHours = totalRooms / targetRph
        const neededOutMinutes = inTotalMinutes + neededHours * 60 + breakVal * 60
        compare = {
          workHours: Math.round(neededHours * 100) / 100,
          rph: targetRph,
          outTime: toDbTime(Math.floor(neededOutMinutes / 60), Math.round(neededOutMinutes % 60)),
          rphDiff: Math.round((targetRph - standardRph) * 100) / 100,
          minutesDiff: Math.round((neededHours - standardHours) * 60)
        }
      }
    }
    setEstResult({
      standardMinutes,
      standardHours: Math.round(standardHours * 100) / 100,
      standardRph: Math.round(standardRph * 100) / 100,
      standardOutTime: toDbTime(outHour, outMinute),
      compare
    })
  }

  function calculateBreakEnd() {
    const parsed = parseTimeInput(breakStartTime)
    if (!parsed) { alert('Please enter break start time'); return }
    const totalMin = parsed.hour * 60 + parsed.minute + parseInt(breakDuration)
    setBreakEndResult({
      startDisplay: formatTime12(toDbTime(parsed.hour, parsed.minute)),
      endDisplay: formatTime12(toDbTime(Math.floor(totalMin / 60), totalMin % 60)),
      duration: breakDuration
    })
  }

  // schedule helpers
  async function toggleScheduleDate(dateStr) {
    const existing = schedules.find(s => s.work_date === dateStr)
    if (existing) {
      if (!window.confirm(`Remove shift on ${dateStr}?`)) return
      await supabase.from('schedules').delete().eq('id', existing.id)
    } else {
      await supabase.from('schedules').insert([{ work_date: dateStr }])
    }
    fetchSchedules()
  }

  function getCalendarDays(yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number)
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }

  function changeMonth(direction) {
    const [year, month] = scheduleMonth.split('-').map(Number)
    let newMonth = month + direction
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear++ }
    if (newMonth < 1) { newMonth = 12; newYear-- }
    setScheduleMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`)
  }

  function isScheduled(dateStr) {
    return schedules.some(s => s.work_date === dateStr)
  }

  function getMonthScheduleCount() {
    return schedules.filter(s => s.work_date.startsWith(scheduleMonth)).length
  }

  return (
    <div className="app">
      <h1>Housekeeping Tracker</h1>

      <div className="nav">
        <button className={currentPage === 'form' ? 'active' : ''} onClick={() => setCurrentPage('form')}>Record</button>
        <button className={currentPage === 'history' ? 'active' : ''} onClick={() => setCurrentPage('history')}>History</button>
        <button className={currentPage === 'stats' ? 'active' : ''} onClick={() => setCurrentPage('stats')}>Stats</button>
        <button className={currentPage === 'schedule' ? 'active' : ''} onClick={() => setCurrentPage('schedule')}>Schedule</button>
        <button className={currentPage === 'tools' ? 'active' : ''} onClick={() => setCurrentPage('tools')}>Tools</button>
      </div>

      {currentPage === 'form' && (
        <div className="form-section">
          <h2>{editingId ? 'Edit Record' : 'New Record'}</h2>

          <div className="field-card">
            <label>Date</label>
            <input type="date" value={workDate} onChange={e => setWorkDate(e.target.value)} />
          </div>
          <div className="field-card">
            <label>C/O (Checkout Rooms)</label>
            <input type="number" min="0" value={checkoutRooms} onChange={e => setCheckoutRooms(e.target.value)} />
          </div>
          <div className="field-card">
            <label>S/O (Stayover Rooms)</label>
            <input type="number" min="0" value={stayoverRooms} onChange={e => setStayoverRooms(e.target.value)} />
          </div>
          <div className="field-card">
            <label>In Time <span className="time-hint">e.g. 813 = 8:13 AM</span></label>
            <input type="text" inputMode="numeric" placeholder="e.g. 813" value={inTimeInput} onChange={e => setInTimeInput(e.target.value)} />
            {inTimeInput && <div className="time-preview">{timePreview(inTimeInput)}</div>}
          </div>
          <div className="field-card">
            <label>Out Time <span className="time-hint">e.g. 1435 = 2:35 PM</span></label>
            <input type="text" inputMode="numeric" placeholder="e.g. 1435" value={outTimeInput} onChange={e => setOutTimeInput(e.target.value)} />
            {outTimeInput && <div className="time-preview">{timePreview(outTimeInput)}</div>}
          </div>
          <div className="field-card">
            <label>Break</label>
            <select value={breakHours} onChange={e => setBreakHours(e.target.value)}>
              <option value="0">No break</option>
              <option value="0.25">15 min</option>
              <option value="0.5">30 min</option>
              <option value="0.75">45 min</option>
              <option value="1">1 hour</option>
            </select>
          </div>
          <div className="field-card">
            <label>Note</label>
            <input type="text" placeholder="Optional" value={note} onChange={e => setNote(e.target.value)} />
          </div>

          <div className="button-group">
            <button className="calc-btn" onClick={calculate}>Calculate RPH</button>
            {totalHours !== null && (
              <button className="save-btn" onClick={saveRecord}>{editingId ? 'Update' : 'Save'}</button>
            )}
            <button className="reset-btn" onClick={clearForm}>Reset</button>
          </div>

          {totalHours !== null && (
            <div className="result">
              <p>Total Hours: <strong>{totalHours}</strong></p>
              <p>RPH: <strong>{rph}</strong></p>
            </div>
          )}
        </div>
      )}

      {currentPage === 'history' && (
        <div className="history-section">
          <h2>History</h2>
          {records.length === 0 ? (
            <p>No records yet</p>
          ) : (
            <div className="records-list">
              {Object.entries(
                records.reduce((groups, record) => {
                  const month = record.work_date.slice(0, 7)
                  if (!groups[month]) groups[month] = []
                  groups[month].push(record)
                  return groups
                }, {})
              ).map(([month, monthRecords]) => (
                <div key={month} className="month-group">
                  <div className="month-header" onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}>
                    <span>{month}</span>
                    <span>{monthRecords.length} days | {Math.round(monthRecords.reduce((s, r) => s + r.total_hours, 0) * 100) / 100} hrs</span>
                    <span>{expandedMonth === month ? '▲' : '▼'}</span>
                  </div>
                  {expandedMonth === month && monthRecords.map(record => (
                    <div key={record.id} className="record-card">
                      <div className="record-date">{record.work_date}</div>
                      <div className="record-details">
                        <span>C/O: {record.checkout_rooms}</span>
                        <span>S/O: {record.stayover_rooms}</span>
                        <span>{formatTime12(record.in_time)} - {formatTime12(record.out_time)}</span>
                      </div>
                      <div className="record-stats">
                        <span>Hours: {record.total_hours}</span>
                        <span>RPH: {record.rph}</span>
                      </div>
                      {record.note && <div className="record-note">{record.note}</div>}
                      <div className="record-actions">
                        <button onClick={() => editRecord(record)}>Edit</button>
                        <button onClick={() => deleteRecord(record.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentPage === 'stats' && (
        <div className="stats-section">
          <h2>Pay Period Stats</h2>
          <div className="field-card">
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="field-card">
            <label>End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="field-card">
            <label>Hourly Rate ($)</label>
            <input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
          </div>
          <button className="calc-btn" onClick={calculateStats}>Calculate</button>
          {stats && (
            <div className="stats-result">
              <p>Total Days Worked: <strong>{stats.totalDays}</strong></p>
              <p>Total Hours: <strong>{stats.totalWorkHours}</strong></p>
              <p>Avg Hours/Day: <strong>{stats.avgHoursPerDay}</strong></p>
              <p>Gross Pay (before tax): <strong>${stats.grossPay}</strong></p>
            </div>
          )}
        </div>
      )}

      {currentPage === 'schedule' && (
        <div className="form-section">
          <h2>Work Schedule</h2>

          <div className="calendar-nav">
            <button onClick={() => changeMonth(-1)}>◀</button>
            <span className="calendar-title">{scheduleMonth}</span>
            <button onClick={() => changeMonth(1)}>▶</button>
          </div>

          <div className="calendar-info">
            <span>{getMonthScheduleCount()} shifts this month</span>
          </div>

          <div className="calendar-grid">
            <div className="calendar-header">Sun</div>
            <div className="calendar-header">Mon</div>
            <div className="calendar-header">Tue</div>
            <div className="calendar-header">Wed</div>
            <div className="calendar-header">Thu</div>
            <div className="calendar-header">Fri</div>
            <div className="calendar-header">Sat</div>
            {getCalendarDays(scheduleMonth).map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="calendar-day empty"></div>
              const dateStr = `${scheduleMonth}-${String(day).padStart(2, '0')}`
              const scheduled = isScheduled(dateStr)
              const today = new Date().toISOString().slice(0, 10) === dateStr
              return (
                <div
                  key={dateStr}
                  className={`calendar-day ${scheduled ? 'scheduled' : ''} ${today ? 'today' : ''}`}
                  onClick={() => toggleScheduleDate(dateStr)}
                >
                  {day}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {currentPage === 'tools' && (
        <div className="form-section">
          <h2>Tools</h2>
          <div className="field-card">
            <label>Select Tool</label>
            <select value={activeTool} onChange={e => setActiveTool(e.target.value)}>
              <option value="estimator">Standard Estimator</option>
              <option value="breaktimer">Break Timer</option>
            </select>
          </div>

          {activeTool === 'breaktimer' && (
            <>
              <div className="field-card">
                <label>Break Start Time <span className="time-hint">e.g. 1130 = 11:30 AM</span></label>
                <input type="text" inputMode="numeric" placeholder="e.g. 1130" value={breakStartTime} onChange={e => { setBreakStartTime(e.target.value); setBreakEndResult(null) }} />
                {breakStartTime && <div className="time-preview">{timePreview(breakStartTime)}</div>}
              </div>
              <div className="field-card">
                <label>Break Duration</label>
                <select value={breakDuration} onChange={e => { setBreakDuration(e.target.value); setBreakEndResult(null) }}>
                  <option value="15">15 min</option>
                  <option value="20">20 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">1 hour</option>
                </select>
              </div>
              <button className="calc-btn" onClick={calculateBreakEnd}>Calculate</button>
              {breakEndResult && (
                <div className="result">
                  <p>Break Start: <strong>{breakEndResult.startDisplay}</strong></p>
                  <p>Duration: <strong>{breakEndResult.duration} min</strong></p>
                  <p>Back to Work: <strong style={{fontSize: '20px', color: '#4CAF50'}}>{breakEndResult.endDisplay}</strong></p>
                </div>
              )}
            </>
          )}

          {activeTool === 'estimator' && (
            <>
              <div className="field-card">
                <label>In Time <span className="time-hint">e.g. 800 = 8:00 AM</span></label>
                <input type="text" inputMode="numeric" placeholder="e.g. 800" value={estInTime} onChange={e => { setEstInTime(e.target.value); setEstResult(null) }} />
                {estInTime && <div className="time-preview">{timePreview(estInTime)}</div>}
              </div>
              <div className="field-card">
                <label>C/O (Checkout Rooms)</label>
                <input type="number" min="0" value={estCheckout} onChange={e => { setEstCheckout(e.target.value); setEstResult(null) }} />
              </div>
              <div className="field-card">
                <label>S/O (Stayover Rooms)</label>
                <input type="number" min="0" value={estStayover} onChange={e => { setEstStayover(e.target.value); setEstResult(null) }} />
              </div>
              <div className="field-card">
                <label>Break</label>
                <select value={estBreak} onChange={e => { setEstBreak(e.target.value); setEstResult(null) }}>
                  <option value="0">No break</option>
                  <option value="0.5">30 min</option>
                </select>
              </div>
              <button className="calc-btn" onClick={calculateStandard}>Calculate Standard</button>
              {estResult && (
                <div className="result">
                  <p><strong>--- Standard Reference ---</strong></p>
                  <p>Standard Work Time: <strong>{estResult.standardMinutes} min ({estResult.standardHours} hrs)</strong></p>
                  <p>Standard Out Time: <strong>{formatTime12(estResult.standardOutTime)}</strong></p>
                  <p>Standard RPH: <strong>{estResult.standardRph}</strong></p>
                </div>
              )}
              {estResult && (
                <>
                  <div className="field-card" style={{marginTop: '16px'}}>
                    <label>Compare By</label>
                    <select value={estMode} onChange={e => { setEstMode(e.target.value); setEstOutTime(''); setEstTargetRph(''); setEstResult({...estResult, compare: null}) }}>
                      <option value="outtime">By Out Time</option>
                      <option value="rph">By Target RPH</option>
                    </select>
                  </div>
                  {estMode === 'outtime' && (
                    <div className="field-card">
                      <label>Your Estimated Out Time <span className="time-hint">e.g. 1430 = 2:30 PM</span></label>
                      <input type="text" inputMode="numeric" placeholder="e.g. 1430" value={estOutTime} onChange={e => setEstOutTime(e.target.value)} />
                      {estOutTime && <div className="time-preview">{timePreview(estOutTime)}</div>}
                    </div>
                  )}
                  {estMode === 'rph' && (
                    <div className="field-card">
                      <label>Your Target RPH</label>
                      <input type="number" step="0.1" placeholder="e.g. 1.5" value={estTargetRph} onChange={e => setEstTargetRph(e.target.value)} />
                    </div>
                  )}
                  <button className="calc-btn" style={{marginTop: '10px'}} onClick={calculateStandard}>Compare</button>
                </>
              )}
              {estResult && estResult.compare && (
                <div className="stats-result">
                  <p><strong>--- Your Estimate vs Standard ---</strong></p>
                  <p>Your Work Hours: <strong>{estResult.compare.workHours} hrs</strong></p>
                  <p>Your RPH: <strong>{estResult.compare.rph}</strong></p>
                  {estMode === 'rph' && estResult.compare.outTime && (
                    <p>You Need to Finish By: <strong>{formatTime12(estResult.compare.outTime)}</strong></p>
                  )}
                  <p>RPH Difference: <strong style={{color: estResult.compare.rphDiff >= 0 ? '#f44336' : '#4CAF50'}}>
                    {estResult.compare.rphDiff > 0 ? '+' : ''}{estResult.compare.rphDiff}
                  </strong></p>
                  <p>Time Difference: <strong style={{color: estResult.compare.minutesDiff > 0 ? '#f44336' : '#4CAF50'}}>
                    {estResult.compare.minutesDiff > 0 ? '+' : ''}{estResult.compare.minutesDiff} min
                  </strong></p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App