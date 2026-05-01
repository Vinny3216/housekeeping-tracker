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

  // page: 'form' | 'history' | 'stats'
  const [currentPage, setCurrentPage] = useState('form')

  // edit mode
  const [editingId, setEditingId] = useState(null)

  // history month expand
  const [expandedMonth, setExpandedMonth] = useState(null)

  // load records on mount
  useEffect(() => {
    fetchRecords()
  }, [])

  // parse number input to time string "HH:MM"
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

  // convert parsed time to 24h "HH:MM" for database
  function toDbTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  // format time for display
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

  // fetch all records from database
  async function fetchRecords() {
    const { data, error } = await supabase
      .from('work_records')
      .select('*')
      .order('work_date', { ascending: false })

    if (error) {
      console.error('Error fetching records:', error)
    } else {
      setRecords(data)
    }
  }

  // calculate total hours and RPH
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

  // save or update record
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
      const result = await supabase
        .from('work_records')
        .update(record)
        .eq('id', editingId)
      error = result.error
    } else {
      const result = await supabase
        .from('work_records')
        .insert([record])
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

  // clear form
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

  // delete record
  async function deleteRecord(id) {
    if (!window.confirm('Are you sure you want to delete this record?')) return

    const { error } = await supabase
      .from('work_records')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting: ' + error.message)
    } else {
      fetchRecords()
    }
  }

  // load record into form for editing
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

  // calculate pay period stats
  function calculateStats() {
    if (!startDate || !endDate) {
      alert('Please select start and end dates')
      return
    }

    const filtered = records.filter(r =>
      r.work_date >= startDate && r.work_date <= endDate
    )

    if (filtered.length === 0) {
      alert('No records found in this date range')
      return
    }

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

  // show preview of parsed time
  function timePreview(val) {
    const parsed = parseTimeInput(val)
    if (!parsed) return ''
    if (parsed.minute > 59 || parsed.hour > 23) return 'Invalid'
    return formatTime12(toDbTime(parsed.hour, parsed.minute))
  }

  return (
    <div className="app">
      <h1>Housekeeping Tracker</h1>

      <div className="nav">
        <button
          className={currentPage === 'form' ? 'active' : ''}
          onClick={() => setCurrentPage('form')}
        >
          Record
        </button>
        <button
          className={currentPage === 'history' ? 'active' : ''}
          onClick={() => setCurrentPage('history')}
        >
          History
        </button>
        <button
          className={currentPage === 'stats' ? 'active' : ''}
          onClick={() => setCurrentPage('stats')}
        >
          Stats
        </button>
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
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 813"
              value={inTimeInput}
              onChange={e => setInTimeInput(e.target.value)}
            />
            {inTimeInput && <div className="time-preview">{timePreview(inTimeInput)}</div>}
          </div>

          <div className="field-card">
            <label>Out Time <span className="time-hint">e.g. 1435 = 2:35 PM</span></label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1435"
              value={outTimeInput}
              onChange={e => setOutTimeInput(e.target.value)}
            />
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
              <button className="save-btn" onClick={saveRecord}>
                {editingId ? 'Update' : 'Save'}
              </button>
            )}
            {editingId && (
              <button className="cancel-btn" onClick={clearForm}>Cancel</button>
            )}
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
                  <div
                    className="month-header"
                    onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                  >
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
    </div>
  )
}

export default App