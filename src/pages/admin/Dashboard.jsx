"use client"

import { useState, useEffect } from "react"
import { BarChart3, CheckCircle2, Clock, ListTodo, Users, AlertTriangle, Filter } from 'lucide-react'
import AdminLayout from "../../components/layout/AdminLayout.jsx"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"

export default function AdminDashboard() {
  const [taskView, setTaskView] = useState("recent")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterStaff, setFilterStaff] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  
  // State for Master Sheet dropdown
  const [masterSheetOptions, setMasterSheetOptions] = useState([])
  const [selectedMasterOption, setSelectedMasterOption] = useState("")
  const [isFetchingMaster, setIsFetchingMaster] = useState(false)
  
  // State for department data
  const [departmentData, setDepartmentData] = useState({
    allTasks: [],
    staffMembers: [],
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    activeStaff: 0,
    completionRate: 0,
    barChartData: [],
    pieChartData: []
  })
  
  // Store the current date for overdue calculation
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Format date as DD/MM/YYYY
  const formatDateToDDMMYYYY = (date) => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }
  
  // Parse DD/MM/YYYY to Date object
  const parseDateFromDDMMYYYY = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    return new Date(parts[2], parts[1] - 1, parts[0])
  }
  
  // Function to check if a date is in the past
  const isDateInPast = (dateStr) => {
    const date = parseDateFromDDMMYYYY(dateStr)
    if (!date) return false
    return date < currentDate
  }
  
  // Safe access to cell value
  const getCellValue = (row, index) => {
    if (!row || !row.c || index >= row.c.length) return null
    const cell = row.c[index]
    return cell && 'v' in cell ? cell.v : null
  }
  
  // Parse Google Sheets Date format into a proper date string
  const parseGoogleSheetsDate = (dateStr) => {
    if (!dateStr) return ''
    
    if (typeof dateStr === 'string' && dateStr.startsWith('Date(')) {
      // Handle Google Sheets Date(year,month,day) format
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateStr)
      if (match) {
        const year = parseInt(match[1], 10)
        const month = parseInt(match[2], 10) // 0-indexed in Google's format
        const day = parseInt(match[3], 10)
        
        // Format as DD/MM/YYYY
        return `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`
      }
    }
    
    // If it's already in DD/MM/YYYY format, return as is
    if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateStr
    }
    
    // If we get here, try to parse as a date and format
    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return formatDateToDDMMYYYY(date)
      }
    } catch (e) {
      console.error("Error parsing date:", e)
    }
    
    // Return original if parsing fails
    return dateStr
  }
  
  // Function to fetch column A from master sheet
  const fetchMasterSheetColumnA = async () => {
    try {
      setIsFetchingMaster(true)
      const response = await fetch(`https://docs.google.com/spreadsheets/d/1jOBkMxcHrusTlAV9l21JN-B-5QWq1dDyj3-0kxbK6ik/gviz/tq?tqx=out:json&sheet=MASTER`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch master sheet data: ${response.status}`)
      }
      
      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)
      
      // Extract column A values (first column)
      const columnAValues = data.table.rows
        .map(row => {
          // Check if row has 'c' property and first cell exists
          if (row && row.c && row.c[0]) {
            // Get value from first cell ('v' property)
            return row.c[0].v || null
          }
          return null
        })
        .filter(value => value !== null && value !== '') // Remove empty values
      
      // Add default option
      const options = ["Select Department", ...columnAValues]
      setMasterSheetOptions(options)
      
      // If no option is selected yet, set the default
      if (!selectedMasterOption) {
        setSelectedMasterOption(options[0])
      }
      
      // Count active staff (column C)
      let activeStaffCount = 0
      data.table.rows.forEach(row => {
        const cellValue = getCellValue(row, 2) // Column C (index 2)
        if (cellValue !== null && cellValue !== '') {
          activeStaffCount++
        }
      })
      
      setDepartmentData(prev => ({
        ...prev,
        activeStaff: activeStaffCount
      }))
      
    } catch (error) {
      console.error("Error fetching master sheet data:", error)
      // Add fallback options in case of error
      setMasterSheetOptions(["Error loading master data"])
    } finally {
      setIsFetchingMaster(false)
    }
  }
  
  // Function to fetch department sheet data
  const fetchDepartmentData = async (department) => {
    if (!department || department === "Select Department") {
      return
    }
    
    try {
      setIsFetchingMaster(true)
      const response = await fetch(`https://docs.google.com/spreadsheets/d/1jOBkMxcHrusTlAV9l21JN-B-5QWq1dDyj3-0kxbK6ik/gviz/tq?tqx=out:json&sheet=${department}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${department} sheet data: ${response.status}`)
      }
      
      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)
      
      // Get current user details
      const username = sessionStorage.getItem('username')
      const userRole = sessionStorage.getItem('role')
      
      // Initialize counters
      let totalTasks = 0
      let completedTasks = 0
      let pendingTasks = 0
      let overdueTasks = 0
      
      // Monthly data for bar chart
      const monthlyData = {
        Jan: { completed: 0, pending: 0 },
        Feb: { completed: 0, pending: 0 },
        Mar: { completed: 0, pending: 0 },
        Apr: { completed: 0, pending: 0 },
        May: { completed: 0, pending: 0 },
        Jun: { completed: 0, pending: 0 },
        Jul: { completed: 0, pending: 0 },
        Aug: { completed: 0, pending: 0 },
        Sep: { completed: 0, pending: 0 },
        Oct: { completed: 0, pending: 0 },
        Nov: { completed: 0, pending: 0 },
        Dec: { completed: 0, pending: 0 }
      }
      
      // Status data for pie chart
      const statusData = {
        Completed: 0,
        Pending: 0,
        Overdue: 0
      }
      
      // Staff tracking map
      const staffTrackingMap = new Map()
      
      // Process row data
      const processedRows = data.table.rows.map((row, rowIndex) => {
        // Skip header row
        if (rowIndex === 0) return null
        
        // For non-admin users, filter by username in Column E (index 4)
        const assignedTo = getCellValue(row, 4) || 'Unassigned'
        const isUserMatch = userRole === 'admin' || 
                            assignedTo.toLowerCase() === username.toLowerCase()
        
        // If not a match and not admin, skip this row
        if (!isUserMatch) return null
        
        // Check column B for valid task row
        const columnBValue = getCellValue(row, 1) // Column B (index 1)
        if (columnBValue === null || columnBValue === '') return null
        
        totalTasks++
        
        // Get task details
        const title = columnBValue || 'Untitled Task'
        
        // Track staff details
        if (!staffTrackingMap.has(assignedTo)) {
          staffTrackingMap.set(assignedTo, {
            name: assignedTo,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            progress: 0
          })
        }
        const staffData = staffTrackingMap.get(assignedTo)
        staffData.totalTasks++
        
        // Get due date from Column L (index 11)
        let dueDateValue = getCellValue(row, 11)
        const dueDate = dueDateValue ? parseGoogleSheetsDate(String(dueDateValue)) : ''
        
        // Get completion date from Column M (index 12)
        let completionDateValue = getCellValue(row, 12)
        const completedDate = completionDateValue ? parseGoogleSheetsDate(String(completionDateValue)) : ''
        
        // Determine task status
        let status = 'pending'
        const today = new Date()
        
        if (dueDate && completedDate) {
          // Task is completed
          status = 'completed'
          completedTasks++
          statusData.Completed++
          staffData.completedTasks++
          
          // Update monthly data
          const completedMonth = parseDateFromDDMMYYYY(completedDate)
          if (completedMonth) {
            const monthName = completedMonth.toLocaleString('default', { month: 'short' })
            if (monthlyData[monthName]) {
              monthlyData[monthName].completed++
            }
          }
        } else if (dueDate && isDateInPast(dueDate)) {
          // Task is overdue
          status = 'overdue'
          overdueTasks++
          statusData.Overdue++
        } else if (dueDate) {
          // Task is pending
          pendingTasks++
          statusData.Pending++
          staffData.pendingTasks++
          
          // Update monthly data
          const dueMonth = parseDateFromDDMMYYYY(dueDate)
          if (dueMonth) {
            const monthName = dueMonth.toLocaleString('default', { month: 'short' })
            if (monthlyData[monthName]) {
              monthlyData[monthName].pending++
            }
          }
        }
        
        return {
          id: rowIndex,
          title,
          assignedTo,
          dueDate,
          status,
          frequency: getCellValue(row, 5) || 'one-time'
        }
      }).filter(task => task !== null)
      
      // Calculate completion rate
      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
      
      // Convert monthly data to chart format
      const barChartData = Object.entries(monthlyData).map(([name, data]) => ({
        name,
        completed: data.completed,
        pending: data.pending
      }))
      
      // Convert status data to pie chart format
      const pieChartData = [
        { name: "Completed", value: statusData.Completed, color: "#22c55e" },
        { name: "Pending", value: statusData.Pending, color: "#facc15" },
        { name: "Overdue", value: statusData.Overdue, color: "#ef4444" }
      ]
      
      // Process staff tracking map
      const staffMembers = Array.from(staffTrackingMap.values()).map(staff => {
        const progress = staff.totalTasks > 0 
          ? Math.round((staff.completedTasks / staff.totalTasks) * 100) 
          : 0
        
        return {
          id: staff.name.replace(/\s+/g, '-').toLowerCase(),
          name: staff.name,
          email: `${staff.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          totalTasks: staff.totalTasks,
          completedTasks: staff.completedTasks,
          pendingTasks: staff.pendingTasks,
          progress
        }
      })
      
      // Update department data state
      setDepartmentData({
        allTasks: processedRows,
        staffMembers,
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        activeStaff: departmentData.activeStaff,
        completionRate,
        barChartData,
        pieChartData
      })
      
    } catch (error) {
      console.error(`Error fetching ${department} sheet data:`, error)
    } finally {
      setIsFetchingMaster(false)
    }
  }
  
  // Fetch master sheet data on component mount
  useEffect(() => {
    setCurrentDate(new Date())
    fetchMasterSheetColumnA()
  }, [])
  
  // Fetch department data when selection changes
  useEffect(() => {
    if (selectedMasterOption && selectedMasterOption !== "Select Department") {
      fetchDepartmentData(selectedMasterOption)
    }
  }, [selectedMasterOption])
  
  // Filter tasks based on the filter criteria
  const filteredTasks = departmentData.allTasks.filter((task) => {
    // Filter by status
    if (filterStatus !== "all" && task.status !== filterStatus) return false

    // Filter by staff
    if (filterStaff !== "all" && task.assignedTo !== filterStaff) return false

    // Filter by search query
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }

    return true
  })

  // Filter tasks based on the tab view
// Filter tasks based on the tab view
const getTasksByView = (view) => {
  // Get today's date and tomorrow's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return filteredTasks.filter((task) => {
    if (task.status === "completed") return false; // Don't show completed tasks in any view
    
    const dueDate = parseDateFromDDMMYYYY(task.dueDate);
    if (!dueDate) return false; // Skip tasks without valid due dates
    
    switch (view) {
      case "recent":
        // Show tasks due today (pending only)
        return (
          dueDate.getDate() === today.getDate() &&
          dueDate.getMonth() === today.getMonth() &&
          dueDate.getFullYear() === today.getFullYear()
        );
      case "upcoming":
        // Show tasks due tomorrow (pending only)
        return (
          dueDate.getDate() === tomorrow.getDate() &&
          dueDate.getMonth() === tomorrow.getMonth() &&
          dueDate.getFullYear() === tomorrow.getFullYear()
        );
      case "overdue":
        // Show tasks with due dates in the past (pending only)
        return dueDate < today;
      default:
        return true;
    }
  });
};

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600 text-white"
      case "pending":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "overdue":
        return "bg-red-500 hover:bg-red-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  const getFrequencyColor = (frequency) => {
    switch (frequency) {
      case "one-time":
        return "bg-gray-500 hover:bg-gray-600 text-white"
      case "daily":
        return "bg-blue-500 hover:bg-blue-600 text-white"
      case "weekly":
        return "bg-purple-500 hover:bg-purple-600 text-white"
      case "fortnightly":
        return "bg-indigo-500 hover:bg-indigo-600 text-white"
      case "monthly":
        return "bg-orange-500 hover:bg-orange-600 text-white"
      case "quarterly":
        return "bg-amber-500 hover:bg-amber-600 text-white"
      case "yearly":
        return "bg-emerald-500 hover:bg-emerald-600 text-white"
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

  // Tasks Overview Chart Component
  const TasksOverviewChart = () => {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={departmentData.barChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" fontSize={12} stroke="#888888" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#888888" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
          <Tooltip />
          <Legend />
          <Bar dataKey="completed" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Tasks Completion Chart Component
  const TasksCompletionChart = () => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={departmentData.pieChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
            {departmentData.pieChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // Staff Tasks Table Component
  const StaffTasksTable = () => {
    return (
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Tasks
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {departmentData.staffMembers.map((staff) => (
              <tr key={staff.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                    <div className="text-xs text-gray-500">{staff.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.totalTasks}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.completedTasks}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{staff.pendingTasks}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-[100px] bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${staff.progress}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500">{staff.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {staff.progress >= 80 ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Excellent
                    </span>
                  ) : staff.progress >= 60 ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Good
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Needs Improvement
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-purple-500">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            {/* Master Sheet Column A dropdown */}
            <select
              value={selectedMasterOption}
              onChange={(e) => setSelectedMasterOption(e.target.value)}
              className="w-[180px] rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              disabled={isFetchingMaster}
            >
              {isFetchingMaster ? (
                <option>Loading...</option>
              ) : (
                masterSheetOptions.map((option, index) => (
                  <option key={index} value={option}>
                    {option}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-all bg-white">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-blue-700">Total Tasks</h3>
              <ListTodo className="h-4 w-4 text-blue-500" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-blue-700">{departmentData.totalTasks}</div>
              <p className="text-xs text-blue-600">
                {selectedMasterOption !== "Select Department" ? `Total tasks in ${selectedMasterOption}` : "Select a department"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all bg-white">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-green-50 to-green-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-green-700">Completed Tasks</h3>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-green-700">{departmentData.completedTasks}</div>
              <p className="text-xs text-green-600">Tasks with Column L & M filled</p>
            </div>
          </div>

          <div className="rounded-lg border border-l-4 border-l-amber-500 shadow-md hover:shadow-lg transition-all bg-white">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-amber-50 to-amber-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-amber-700">Pending Tasks</h3>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-amber-700">{departmentData.pendingTasks}</div>
              <p className="text-xs text-amber-600">Tasks with Column L filled, M empty</p>
            </div>
          </div>

          <div className="rounded-lg border border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-all bg-white">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-red-50 to-red-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-red-700">Overdue Tasks</h3>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-red-700">{departmentData.overdueTasks}</div>
              <p className="text-xs text-red-600">Tasks with Column L past due date</p>
            </div>
          </div>
        </div>

        {/* Task Navigation Tabs */}
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-3">
            <button
              className={`py-3 text-center font-medium transition-colors ${
                taskView === "recent" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setTaskView("recent")}
            >
              Recent Tasks
            </button>
            <button
              className={`py-3 text-center font-medium transition-colors ${
                taskView === "upcoming" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setTaskView("upcoming")}
            >
              Upcoming Tasks
            </button>
            <button
              className={`py-3 text-center font-medium transition-colors ${
                taskView === "overdue" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              onClick={() => setTaskView("overdue")}
            >
              Overdue Tasks
            </button>
          </div>

          <div className="p-4">
            <div className="flex flex-col gap-4 md:flex-row mb-4">
              <div className="flex-1 space-y-2">
                <label htmlFor="search" className="flex items-center text-purple-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Search Tasks
                </label>
                <input
                  id="search"
                  placeholder="Search by task title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-2 md:w-[180px]">
                <label htmlFor="status-filter" className="flex items-center text-purple-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="space-y-2 md:w-[180px]">
                <label htmlFor="staff-filter" className="flex items-center text-purple-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter by Staff
                </label>
                <select
                  id="staff-filter"
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full rounded-md border border-purple-200 p-2 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="all">All Staff</option>
                  {departmentData.staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {getTasksByView(taskView).length === 0 ? (
  <div className="text-center p-8 text-gray-500">
    <p>No tasks found matching your filters.</p>
  </div>
) : (
  <div className="overflow-x-auto" style={{ maxHeight: "400px", overflowY: "auto" }}>
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Task Id
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Assigned To 
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Due Date
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Task Title
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {getTasksByView(taskView).map((task) => (
          <tr key={task.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.title}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.assignedTo}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.dueDate}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getFrequencyColor(task.frequency)}`}
              >
                {task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-l-4 border-l-purple-500 shadow-md hover:shadow-lg transition-all bg-white">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-purple-50 to-purple-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-purple-700">Active Staff</h3>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-purple-700">{departmentData.activeStaff}</div>
              <p className="text-xs text-purple-600">Total staff in Master Sheet Col C</p>
            </div>
          </div>

          <div className="rounded-lg border border-l-4 border-l-indigo-500 shadow-md hover:shadow-lg transition-all lg:col-span-3 bg-white">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-tr-lg p-4">
              <h3 className="text-sm font-medium text-indigo-700">Task Completion Rate</h3>
              <BarChart3 className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-indigo-700">{departmentData.completionRate}%</div>
                <div className="flex items-center space-x-2">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-xs text-gray-600">Completed: {departmentData.completedTasks}</span>
                  <span className="inline-block w-3 h-3 bg-amber-500 rounded-full"></span>
                  <span className="text-xs text-gray-600">Total: {departmentData.totalTasks}</span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-amber-500 rounded-full"
                  style={{ width: `${departmentData.completionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="bg-purple-100 rounded-md p-1 flex space-x-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-2 text-center rounded-md transition-colors ${
                activeTab === "overview" ? "bg-purple-600 text-white" : "text-purple-700 hover:bg-purple-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("mis")}
              className={`flex-1 py-2 text-center rounded-md transition-colors ${
                activeTab === "mis" ? "bg-purple-600 text-white" : "text-purple-700 hover:bg-purple-200"
              }`}
            >
              MIS Report
            </button>
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex-1 py-2 text-center rounded-md transition-colors ${
                activeTab === "staff" ? "bg-purple-600 text-white" : "text-purple-700 hover:bg-purple-200"
              }`}
            >
              Staff Performance
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="lg:col-span-4 rounded-lg border border-purple-200 shadow-md bg-white">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                    <h3 className="text-purple-700 font-medium">Tasks Overview</h3>
                    <p className="text-purple-600 text-sm">Task completion rate over time</p>
                  </div>
                  <div className="p-4 pl-2">
                    <TasksOverviewChart />
                  </div>
                </div>
                <div className="lg:col-span-3 rounded-lg border border-purple-200 shadow-md bg-white">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                    <h3 className="text-purple-700 font-medium">Task Status</h3>
                    <p className="text-purple-600 text-sm">Distribution of tasks by status</p>
                  </div>
                  <div className="p-4">
                    <TasksCompletionChart />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-purple-200 shadow-md bg-white">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                  <h3 className="text-purple-700 font-medium">Staff Task Summary</h3>
                  <p className="text-purple-600 text-sm">Overview of tasks assigned to each staff member</p>
                </div>
                <div className="p-4">
                  <StaffTasksTable />
                </div>
              </div>
            </div>
          )}

          {activeTab === "mis" && (
            <div className="rounded-lg border border-purple-200 shadow-md bg-white">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                <h3 className="text-purple-700 font-medium">MIS Report</h3>
                <p className="text-purple-600 text-sm">Detailed task analytics and performance metrics</p>
              </div>
              <div className="p-4">
                <div className="space-y-8">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-purple-600">Total Tasks Assigned</div>
                      <div className="text-3xl font-bold text-purple-700">{departmentData.totalTasks}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-purple-600">Tasks Completed</div>
                      <div className="text-3xl font-bold text-purple-700">{departmentData.completedTasks}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-purple-600">Tasks Pending/Overdue</div>
                      <div className="text-3xl font-bold text-purple-700">{departmentData.pendingTasks + departmentData.overdueTasks}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-purple-700">Department Performance</h3>
                    <div className="grid gap-4 md:grid-cols-1">
                      <div className="rounded-lg border border-purple-200 bg-white p-4">
                        <h4 className="text-sm font-medium text-purple-700 mb-2">Completion Rate</h4>
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-purple-700">{departmentData.completionRate}%</div>
                          <div className="flex-1">
                            <div className="w-full h-6 bg-gray-200 rounded-full">
                              <div 
                                className="h-full rounded-full flex items-center justify-end px-3 text-xs font-medium text-white"
                                style={{ 
                                  width: `${departmentData.completionRate}%`,
                                  background: `linear-gradient(to right, #10b981 ${departmentData.completionRate * 0.8}%, #f59e0b ${departmentData.completionRate * 0.8}%)` 
                                }}
                              >
                                {departmentData.completionRate}%
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-purple-600 mt-2">
                          {selectedMasterOption !== "Select Department" ? 
                            `${departmentData.completedTasks} of ${departmentData.totalTasks} tasks completed in ${selectedMasterOption}` : 
                            "Select a department to see completion rate"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "staff" && (
            <div className="rounded-lg border border-purple-200 shadow-md bg-white">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 p-4">
                <h3 className="text-purple-700 font-medium">Staff Performance</h3>
                <p className="text-purple-600 text-sm">Task completion rates by staff member</p>
              </div>
              <div className="p-4">
                <div className="space-y-8">
                  {departmentData.staffMembers.length > 0 ? (
                    <>
                      <div className="rounded-md border border-green-200">
                        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200">
                          <h3 className="text-lg font-medium text-green-700">Top Performers</h3>
                          <p className="text-sm text-green-600">Staff with highest task completion rates</p>
                        </div>
                        <div className="p-4">
                          <div className="space-y-4">
                            {departmentData.staffMembers
                              .filter(staff => staff.progress >= 70)
                              .sort((a, b) => b.progress - a.progress)
                              .slice(0, 3)
                              .map((staff) => (
                                <div
                                  key={staff.id}
                                  className="flex items-center justify-between p-3 border border-green-100 rounded-md bg-green-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                                      <span className="text-sm font-medium text-white">{staff.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-green-700">{staff.name}</p>
                                      <p className="text-xs text-green-600">{staff.totalTasks} tasks assigned</p>
                                    </div>
                                  </div>
                                  <div className="text-lg font-bold text-green-600">{staff.progress}%</div>
                                </div>
                              ))
                            }
                            {departmentData.staffMembers.filter(staff => staff.progress >= 70).length === 0 && (
                              <div className="text-center p-4 text-gray-500">
                                <p>No staff members with high completion rates found.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-red-200">
                        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-b border-red-200">
                          <h3 className="text-lg font-medium text-red-700">Needs Improvement</h3>
                          <p className="text-sm text-red-600">Staff with lower task completion rates</p>
                        </div>
                        <div className="p-4">
                          <div className="space-y-4">
                            {departmentData.staffMembers
                              .filter(staff => staff.progress < 70)
                              .sort((a, b) => a.progress - b.progress)
                              .slice(0, 3)
                              .map((staff) => (
                                <div
                                  key={staff.id}
                                  className="flex items-center justify-between p-3 border border-red-100 rounded-md bg-red-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center">
                                      <span className="text-sm font-medium text-white">{staff.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-red-700">{staff.name}</p>
                                      <p className="text-xs text-red-600">{staff.totalTasks} tasks assigned</p>
                                    </div>
                                  </div>
                                  <div className="text-lg font-bold text-red-600">{staff.progress}%</div>
                                </div>
                              ))
                            }
                            {departmentData.staffMembers.filter(staff => staff.progress < 70).length === 0 && (
                              <div className="text-center p-4 text-gray-500">
                                <p>No staff members with low completion rates found.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-8 text-gray-500">
                      <p>No staff data available. Please select a department from the dropdown.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}