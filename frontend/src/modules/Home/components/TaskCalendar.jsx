import React, { useState } from 'react';

function InteractiveCalendar() {
  const [tasks, setTasks] = useState([]);
  const [currentView, setCurrentView] = useState('Week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    time: '',
    date: '',
    priority: 'medium',
    category: 'other',
    color: 'purple'
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date('2025-07-22T12:07:00+05:30');
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  // Correction : Month mode affiche tous les jours du mois en cours (1 à 31 pour juillet 2025)
  const getDaysToDisplay = () => {
    const baseDate = new Date(today);
    switch (currentView) {
      case 'Day':
        return [baseDate];
      case 'Week':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i);
          return d;
        });
      case 'Month': {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => {
          return new Date(year, month, i + 1);
        });
      }
      default:
        return [baseDate];
    }
  };

  const timeSlots = ['07:00 am', '09:00 am', '11:00 am', '01:00 pm', '03:00 pm', '05:00 pm'];

  const getDateSuggestions = () => {
    const suggestions = [];
    const baseDate = new Date(today);

    switch (currentView) {
      case 'Day':
      case 'Week':
        for (let i = 0; i < 30; i++) {
          const date = new Date(baseDate);
          date.setDate(baseDate.getDate() + i);
          suggestions.push({
            value: date.toISOString().split('T')[0],
            label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
          });
        }
        break;
      case 'Month': {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < daysInMonth; i++) {
          const date = new Date(year, month, i + 1);
          suggestions.push({
            value: date.toISOString().split('T')[0],
            label: i === 0 ? 'Today' : date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
          });
        }
        break;
      }
      default:
        suggestions.push({
          value: today.toISOString().split('T')[0],
          label: 'Today'
        });
    }
    return suggestions;
  };

  // Correction : Ajout de tâche avec date et heure précises
  const addTask = () => {
    if (newTask.title && newTask.time && newTask.date) {
      const formattedTime = formatTimeToSlot(newTask.time);
      const taskToAdd = {
        id: Date.now(),
        ...newTask,
        date: newTask.date,
        time: formattedTime // <-- formatte l'heure pour matcher les créneaux
      };
      setTasks([...tasks, taskToAdd]);
      setNewTask({
        title: '',
        description: '',
        time: '',
        date: '',
        priority: 'medium',
        category: 'other',
        color: 'purple'
      });
      setIsModalOpen(false);
    }
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const openModal = () => {
    const defaultDate = currentView === 'Day' ? today.toISOString().split('T')[0] : '';
    setNewTask(prev => ({ ...prev, date: defaultDate }));
    setIsModalOpen(true);
  };

  function formatTimeToSlot(time) {
    if (!time) return '';
    let [hour, minute] = time.split(':');
    hour = parseInt(hour, 10);
    const ampm = hour >= 12 ? 'pm' : 'am';
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12.toString().padStart(2, '0')}:${minute} ${ampm}`;
  }

  return (
    <div className="p-1 h-full" style={{ height: '300px' }}>
      <div className="flex flex-col md:flex-row max-md:gap-1 items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M17 4.50001L17 5.15001L17 4.50001ZM6.99999 4.50002L6.99999 3.85002L6.99999 4.50002ZM8.05078 14.65C8.40977 14.65 8.70078 14.359 8.70078 14C8.70078 13.641 8.40977 13.35 8.05078 13.35V14.65ZM8.00078 13.35C7.6418 13.35 7.35078 13.641 7.35078 14C7.35078 14.359 7.6418 14.65 8.00078 14.65V13.35ZM8.05078 17.65C8.40977 17.65 8.70078 17.359 8.70078 17C8.70078 16.641 8.40977 16.35 8.05078 16.35V17.65ZM8.00078 16.35C7.6418 16.35 7.35078 16.641 7.35078 17C7.35078 17.359 7.6418 17.65 8.00078 17.65V16.35ZM12.0508 14.65C12.4098 14.65 12.7008 14.359 12.7008 14C12.7008 13.641 12.4098 13.35 12.0508 13.35V14.65ZM12.0008 13.35C11.6418 13.35 11.3508 13.641 11.3508 14C11.3508 14.359 11.6418 14.65 12.0008 14.65V13.35ZM12.0508 17.65C12.4098 17.65 12.7008 17.359 12.7008 17C12.7008 16.641 12.4098 16.35 12.0508 16.35V17.65ZM12.0008 16.35C11.6418 16.35 11.3508 16.641 11.3508 17C11.3508 17.359 11.6418 17.65 12.0008 17.65V16.35ZM16.0508 14.65C16.4098 14.65 16.7008 14.359 16.7008 14C16.7008 13.641 16.4098 13.35 16.0508 13.35V14.65ZM16.0008 13.35C15.6418 13.35 15.3508 13.641 15.3508 14C15.3508 14.359 15.6418 14.65 16.0008 14.65V13.35ZM16.0508 17.65C16.4098 17.65 16.7008 17.359 16.7008 17C16.7008 16.641 16.4098 16.35 16.0508 16.35V17.65ZM16.0008 16.35C15.6418 16.35 15.3508 16.641 15.3508 17C15.3508 17.359 15.6418 17.65 16.0008 17.65V16.35ZM8.65 3C8.65 2.64101 8.35898 2.35 8 2.35C7.64102 2.35 7.35 2.64101 7.35 3H8.65ZM7.35 6C7.35 6.35899 7.64102 6.65 8 6.65C8.35898 6.65 8.65 6.35899 8.65 6H7.35ZM16.65 3C16.65 2.64101 16.359 2.35 16 2.35C15.641 2.35 15.35 2.64101 15.35 3H16.65ZM15.35 6C15.35 6.35899 15.641 6.65 16 6.65C16.359 6.65 16.65 6.35899 16.65 6H15.35ZM6.99999 5.15002L17 5.15001L17 3.85001L6.99999 3.85002L6.99999 5.15002ZM20.35 8.50001V17H21.65V8.50001H20.35ZM17 20.35H7V21.65H17V20.35ZM3.65 17V8.50002H2.35V17H3.65ZM7 20.35C6.03882 20.35 5.38332 20.3486 4.89207 20.2826C4.41952 20.2191 4.1974 20.1066 4.04541 19.9546L3.12617 20.8739C3.55996 21.3077 4.10214 21.4881 4.71885 21.571C5.31685 21.6514 6.07557 21.65 7 21.65V20.35ZM2.35 17C2.35 17.9245 2.34862 18.6832 2.42902 19.2812C2.51193 19.8979 2.69237 20.4401 3.12617 20.8739L4.04541 19.9546C3.89341 19.8026 3.78096 19.5805 3.71743 19.108C3.65138 18.6167 3.65 17.9612 3.65 17H2.35ZM20.35 17C20.35 17.9612 20.3486 18.6167 20.2826 19.108C20.219 19.5805 20.1066 19.8026 19.9546 19.9546L20.8738 20.8739C21.3076 20.4401 21.4881 19.8979 21.571 19.2812C21.6514 18.6832 21.65 17.9245 21.65 17H20.35ZM17 21.65C17.9244 21.65 18.6831 21.6514 19.2812 21.571C19.8979 21.4881 20.44 21.3077 20.8738 20.8739L19.9546 19.9546C19.8026 20.1066 19.5805 20.2191 19.1079 20.2826C18.6167 20.3486 17.9612 20.35 17 20.35V21.65ZM17 5.15001C17.9612 5.15 18.6167 5.15138 19.1079 5.21743C19.5805 5.28096 19.8026 5.39341 19.9546 5.54541L20.8738 4.62617C20.44 4.19238 19.8979 4.01194 19.2812 3.92902C18.6831 3.84862 17.9244 3.85001 17 3.85001L17 5.15001ZM21.65 8.50001C21.65 7.57557 21.6514 6.81686 21.571 6.21885C21.4881 5.60214 21.3076 5.05996 20.8738 4.62617L19.9546 5.54541C20.1066 5.6974 20.219 5.91952 20.2826 6.39207C20.3486 6.88332 20.35 7.53882 20.35 8.50001H21.65ZM6.99999 3.85002C6.07556 3.85002 5.31685 3.84865 4.71884 3.92905C4.10214 4.01196 3.55996 4.1924 3.12617 4.62619L4.04541 5.54543C4.1974 5.39344 4.41952 5.28099 4.89207 5.21745C5.38331 5.15141 6.03881 5.15002 6.99999 5.15002L6.99999 3.85002ZM3.65 8.50002C3.65 7.53884 3.65138 6.88334 3.71743 6.39209C3.78096 5.91954 3.89341 5.69743 4.04541 5.54543L3.12617 4.62619C2.69237 5.05999 2.51193 5.60217 2.42902 6.21887C2.34862 6.81688 2.35 7.57559 2.35 8.50002H3.65ZM3 10.65H21V9.35H3V10.65ZM8.05078 13.35H8.00078V14.65H8.05078V13.35ZM8.05078 16.35H8.00078V17.65H8.05078V16.35ZM12.0508 13.35H12.0008V14.65H12.0508V13.35ZM12.0508 16.35H12.0008V17.65H12.0508V16.35ZM16.0508 13.35H16.0008V14.65H16.0508V13.35ZM16.0508 16.35H16.0008V17.65H16.0508V16.35ZM7.35 3V6H8.65V3H7.35ZM15.35 3V6H16.65V3H15.35Z"
              fill="#111827"
            />
          </svg>
          <h6 className="text-sm leading-5 font-semibold text-gray-900">Today, July 2025</h6>
        </div>

        <div className="flex items-center gap-px rounded-lg bg-gray-100 p-0.5">
          {['Day', 'Week', 'Month'].map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`rounded-lg py-1 px-2 text-[10px] font-medium transition-all duration-300 hover:bg-white hover:text-indigo-600 ${
                currentView === view ? 'text-indigo-600 bg-white' : 'text-gray-500'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <button
          className="py-1 pr-2 pl-1 bg-indigo-600 rounded-lg flex items-center gap-0.5 text-xs font-semibold text-white transition-all duration-300 hover:bg-indigo-700"
          onClick={openModal}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path d="M10 5V15M15 10H5" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          New Activity
        </button>
      </div>

      <div className="relative overflow-x-auto h-full" style={{ height: '250px' }}>
        <div className="grid grid-cols-7 border-t border-gray-200 sticky top-0 left-0 bg-white z-10">
          <div className="p-1 flex items-center justify-center text-[8px] font-medium text-gray-900"></div>
          {getDaysToDisplay().map((day, index) => (
            <div key={index} className="p-1 flex items-center justify-center text-[8px] font-medium text-gray-900">
              {day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
            </div>
          ))}
        </div>
        <div className="hidden sm:grid grid-cols-[auto_1fr] w-full h-full overflow-x-auto">
          {timeSlots.map((time, timeIndex) =>
            getDaysToDisplay().map((day, dayIndex) => {
              const dateStr = day.toISOString().split('T')[0];
              // Correction : filtre par date ET heure
              const dayTasks = tasks.filter((t) => t.date === dateStr && t.time === time);
              return (
                <React.Fragment key={`${timeIndex}-${dayIndex}`}>
                  {dayIndex === 0 && (
                    <div className="h-16 p-0.5 border-r border-gray-200 flex items-center justify-center">
                      <span className="text-[8px] font-semibold text-gray-400">{time}</span>
                    </div>
                  )}
                  <div
                    className="h-16 p-0.5 border-t border-r border-gray-200 transition-all hover:bg-stone-100"
                  >
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded p-0.5 border-l-2 relative group ${
                          task.priority === 'high' ? 'border-red-600 bg-red-50' :
                          task.priority === 'medium' ? 'border-yellow-600 bg-yellow-50' :
                          'border-green-600 bg-green-50'
                        }`}
                      >
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="absolute top-0 right-0 w-3 h-3 bg-red-500 text-white rounded-full text-[6px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          style={{ transform: 'translate(25%, -25%)' }}
                        >
                          ×
                        </button>
                        <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                        <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>
        <div className="sm:hidden flex border-t border-gray-200 h-full">
          <div className="w-12">
            {timeSlots.map((time) => (
              <div key={time} className="h-16 p-0.5 flex items-center justify-center text-[6px] font-semibold text-gray-400 border-r border-gray-200">
                {time}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-x-auto">
            {getDaysToDisplay().map((day, dayIndex) => (
              <div key={dayIndex} className="h-48 border-r border-gray-200 inline-block">
                {timeSlots.map((time, timeIndex) => {
                  const dateStr = day.toISOString().split('T')[0];
                  // Correction : filtre par date ET heure
                  const dayTasks = tasks.filter((t) => t.date === dateStr && t.time === time);
                  return (
                    <div key={`${timeIndex}`} className="h-16 p-0.5 border-t border-gray-200">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`rounded p-0.5 border-l-2 relative group ${
                            task.priority === 'high' ? 'border-red-600 bg-red-50' :
                            task.priority === 'medium' ? 'border-yellow-600 bg-yellow-50' :
                            'border-green-600 bg-green-50'
                          }`}
                        >
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="absolute top-0 right-0 w-3 h-3 bg-red-500 text-white rounded-full text-[6px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            style={{ transform: 'translate(25%, -25%)' }}
                          >
                            ×
                          </button>
                          <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                          <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md backdrop-saturate-150 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Task</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Add a title"
                  className="w-full px-3 py-2 text-base text-black border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    value={newTask.date}
                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                    className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div>
                  <input
                    type="time"
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                  required
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveCalendar;