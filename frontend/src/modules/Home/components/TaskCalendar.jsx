import React, { useState } from 'react';

function InteractiveCalendar() {
  const [tasks, setTasks] = useState([]);
  const [currentView, setCurrentView] = useState('Week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
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
  const today = new Date('2025-07-22T15:28:00+05:30'); // 03:28 PM IST
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Calcule le lundi de la semaine actuelle

  const getDaysToDisplay = () => {
    const baseDate = new Date(today);
    switch (currentView) {
      case 'Day':
        return [baseDate];
      case 'Week':
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + i + (weekStart.getDay() === 0 ? -6 : 1)); // Décale pour commencer par Monday
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

  const addTask = () => {
    if (newTask.title && newTask.time && newTask.date) {
      const taskToAdd = {
        id: Date.now(),
        ...newTask,
        date: newTask.date,
        time: newTask.time // Utilise directement le time sélectionné sans reformater
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
              d="M17 4.50001L17 5.15001L17 4.50001ZM6.99999 4.50002L6.99999 3.85002L6.99999 4.50002ZM8.05078 14.65C8.40977 14.65 8.70078 14.359 8.70078 14C8.70078 13.641 8.40977 13.35 8.05078 13.35V14.65ZM8.00078 13.35C7.6418 13.35 7.35078 13.641 7.35078 14C7.35078 14.359 7.6418 14.65 8.00078 14.65V13.35ZM8.05078 17.65C8.40977 17.65 8.70078 17.359 8.70078 17C8.70078 16.641 8.40977 16.35 8.05078 16.35V17.65ZM8.00078 16.35C7.6418 16.35 7.35078 16.641 7.35078 17C7.35078 17.359 7.6418 17.65 8.00078 17.65V16.35ZM12.0508 14.65C12.4098 14.65 12.7008 14.359 12.7008 14C12.7008 13.641 12.4098 13.35 12.0508 13.35V14.65ZM12.0008 13.35C11.6418 13.35 11.3508 13.641 11.3508 14C11.3508 14.359 11.6418 14.65 12.0008 14.65V13.35ZM12.0508 17.65C12.4098 17.65 12.7008 17.359 12.7008 17C12.7008 16.641 12.4098 16.35 12.0508 16.35V17.65ZM12.0008 16.35C11.6418 16.35 11.3508 16.641 11.3508 17C11.3508 17.359 11.6418 17.65 12.0008 17.65V16.35ZM16.0508 14.65C16.4098 14.65 16.7008 14.359 16.7008 14C16.7008 13.641 16.4098 13.35 16.0508 13.35V14.65ZM16.0008 13.35C15.6418 13.35 15.3508 13.641 15.3508 14C15.3508 14.359 15.6418 14.65 16.0008 14.65V13.35ZM16.0508 17.65C16.4098 17.65 16.7008 17.359 16.7008 17C16.7008 16.641 16.4098 16.35 16.0508 16.35V17.65ZM16.0008 16.35C15.6418 16.35 15.3508 16.641 15.3508 17C15.3508 17.359 15.6418 17.65 16.0008 17.65V16.35ZM8.65 3C8.65 2.64101 8.35898 2.35 8 2.35C7.64102 2.35 7.35 2.64101 7.35 3H8.65ZM7.35 6C7.35 6.35899 7.64102 6.65 8 6.65C8.35898 6.65 8.65 6.35899 8.65 6H7.35ZM16.65 3C16.65 2.64101 16.359 2.35 16 2.35C15.641 2.35 15.35 2.64101 15.35 3H16.65ZM15.35 6C15.35 6.35899 15.641 6.65 16 6.65C16.359 6.65 16.65 6.35899 16.65 6H15.35Z"
              fill="#111827"
            />
          </svg>
          <h6 className="text-sm leading-5 font-semibold text-gray-900">
            {currentView === 'Day' && `Today, ${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
            {currentView === 'Week' && `Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`}
            {currentView === 'Month' && `${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
          </h6>
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

        <div className="flex items-center gap-2">
          <button
            className={`py-1 pr-2 pl-1 rounded-lg flex items-center gap-0.5 text-xs font-semibold transition-all duration-300 ${
              isDeleteMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setIsDeleteMode(!isDeleteMode)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M6 6L14 14M6 14L14 6"
                stroke={isDeleteMode ? 'white' : 'currentColor'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            {isDeleteMode ? 'Cancel' : 'Delete Mode'}
          </button>

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
      </div>

      <div
        className="relative overflow-hidden bg-white rounded-lg shadow-md p-4"
        style={{ height: '130%' }}
      >
        {currentView === 'Day' && (
          <div className="grid grid-cols-2 gap-1 h-full">
            <div className="flex flex-col">
              {timeSlots.map((time) => (
                <div key={time} className="h-16 p-1 text-[8px] font-medium text-gray-400 border-r border-gray-200 flex items-center">
                  {time}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-1 h-full overflow-y-auto">
              <div className="p-1 text-center text-xl font-bold text-gray-900">
                {today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              {timeSlots.map((time) => {
                const dateStr = today.toISOString().split('T')[0];
                const dayTasks = tasks.filter((t) => t.date === dateStr && t.time === time);
                return (
                  <div
                    key={time}
                    className="h-16 p-1 border-t border-gray-200 transition-all hover:bg-stone-100"
                  >
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded p-0.5 border-l-2 ${
                          task.color === 'purple' ? 'border-purple-600 bg-purple-50' :
                          task.color === 'blue' ? 'border-blue-600 bg-blue-50' :
                          task.color === 'green' ? 'border-green-600 bg-green-50' :
                          'border-yellow-600 bg-yellow-50'
                        }`}
                      >
                        <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                        <p className="text-[6px] font-light text-gray-700">{task.description}</p>
                        <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
                        {isDeleteMode && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-[6px] text-red-500 hover:underline mt-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {currentView === 'Week' && (
          <div className="grid grid-cols-7 gap-1 h-full overflow-y-auto">
            {getDaysToDisplay().map((day, index) => (
              <div key={index} className="flex flex-col border-r border-gray-200">
                <div className="p-1 text-[8px] font-medium text-gray-900">
                  {day.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {timeSlots.map((time) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayTasks = tasks.filter((t) => t.date === dateStr && t.time === time);
                    return (
                      <div
                        key={time}
                        className="h-16 p-1 border-t border-gray-200 transition-all hover:bg-stone-100"
                      >
                        {dayTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`rounded p-0.5 border-l-2 ${
                              task.color === 'purple' ? 'border-purple-600 bg-purple-50' :
                              task.color === 'blue' ? 'border-blue-600 bg-blue-50' :
                              task.color === 'green' ? 'border-green-600 bg-green-50' :
                              'border-yellow-600 bg-yellow-50'
                            }`}
                          >
                            <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                            <p className="text-[6px] font-light text-gray-700">{task.description}</p>
                            <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
                            {isDeleteMode && (
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="text-[6px] text-red-500 hover:underline mt-1"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {currentView === 'Month' && (
          <div className="h-full overflow-y-auto">
            {/* Ligne des jours de la semaine */}
            <div className="grid grid-cols-7 gap-1 bg-gray-100 p-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-700">
                  {day}
                </div>
              ))}
            </div>

            {/* Contenu des jours du mois */}
            <div className="grid grid-cols-7 gap-1 relative">
              {/* Décalage pour aligner le 1er jour du mois */}
              {(() => {
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
                const offset = (firstDayOfMonth + 6) % 7; // Décale pour que lundi soit le premier jour
                return Array.from({ length: offset }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 p-1 border-t border-r border-gray-200"></div>
                ));
              })()}

              {/* Affichage des jours du mois */}
              {getDaysToDisplay().map((day, index) => {
                // Normalise la date au format local (YYYY-MM-DD)
                const normalizeDate = (date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                };

                const dateStr = normalizeDate(day); // Date normalisée pour le jour actuel
                const dayTasks = tasks.filter((t) => t.date === dateStr); // Compare uniquement les dates normalisées

                return (
                  <div
                    key={index}
                    className="h-16 p-1 border-t border-r border-gray-200 relative"
                  >
                    <div className="text-[8px] font-medium text-gray-900 mb-1">
                      {day.getDate()}
                    </div>
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`rounded p-0.5 border-l-2 ${
                          task.color === 'purple' ? 'border-purple-600 bg-purple-50' :
                          task.color === 'blue' ? 'border-blue-600 bg-blue-50' :
                          task.color === 'green' ? 'border-green-600 bg-green-50' :
                          'border-yellow-600 bg-yellow-50'
                        }`}
                        style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          width: '100%',
                          transition: 'transform 0.2s ease-in-out, z-index 0.2s',
                          zIndex: 1,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.2)';
                          e.currentTarget.style.zIndex = 10; // Passe au premier plan
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.zIndex = 1; // Retourne à son niveau initial
                        }}
                      >
                        <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                        <p className="text-[6px] font-light text-gray-700">{task.description}</p>
                        <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
                        {isDeleteMode && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-[6px] text-red-500 hover:underline mt-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
                  <select
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                    required
                  >
                    <option value="">Select Time</option>
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
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