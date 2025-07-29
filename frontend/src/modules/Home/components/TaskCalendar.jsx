import React, { useState, useEffect } from 'react';

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
  const [selectedTask, setSelectedTask] = useState(null); // <-- Pour la modale de détail

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date(); // Utilise la date et l'heure actuelles
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

  const addTask = async () => {
    if (newTask.title && newTask.time && newTask.date) {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:8080/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(newTask)
        });
        if (res.ok) {
          const savedTask = await res.json();
          setTasks([...tasks, savedTask]);
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
      } catch (err) {
        console.error('Failed to add task:', err);
      }
    }
  };

  const deleteTask = async (taskId) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTasks(tasks.filter(task => task.id !== taskId));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const openModal = () => {
    const defaultDate = currentView === 'Day' ? today.toISOString().split('T')[0] : '';
    setNewTask(prev => ({ ...prev, date: defaultDate }));
    setIsModalOpen(true);
  };

  // --- Ajout pour la modale de détail ---
  const openTaskDetail = (task) => setSelectedTask(task);
  const closeTaskDetail = () => setSelectedTask(null);

  useEffect(() => {
    const fetchTasks = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await fetch('http://localhost:8080/api/tasks', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="p-1 h-full" style={{ height: '300px' }}>
      <div className="flex flex-col md:flex-row max-md:gap-1 items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <img
            src="/calendar.png"
            alt="Calendar Icon"
            className="w-4 h-4"
          />
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
            New Task
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
                        className={`rounded p-0.5 border-l-2 cursor-pointer ${
                          task.priority === 'high'
                            ? 'border-red-600 bg-red-50'
                            : task.priority === 'medium'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-green-600 bg-green-50'
                        }`}
                        onClick={() => openTaskDetail(task)}
                      >
                        <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                        <p
                          className="text-[6px] font-light text-gray-700 break-words overflow-hidden whitespace-nowrap text-ellipsis"
                          title={task.description}
                        >
                          {task.description}
                        </p>
                        <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
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
                            className={`rounded p-0.5 border-l-2 cursor-pointer ${
                              task.priority === 'high'
                                ? 'border-red-600 bg-red-50'
                                : task.priority === 'medium'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-green-600 bg-green-50'
                            }`}
                            onClick={() => openTaskDetail(task)}
                          >
                            <p className="text-[8px] font-normal text-gray-900 mb-px">{task.title}</p>
                            <p
                              className="text-[6px] font-light text-gray-700 break-words overflow-hidden whitespace-nowrap text-ellipsis"
                              title={task.description}
                            >
                              {task.description}
                            </p>
                            <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
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
                        className={`rounded p-0.5 border-l-2 cursor-pointer ${
                          task.priority === 'high'
                            ? 'border-red-600 bg-red-50'
                            : task.priority === 'medium'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-green-600 bg-green-50'
                        }`}
                        style={{
                          position: 'absolute',
                          top: '0',
                          left: '0',
                          width: '100%',
                          transition: 'transform 0.2s ease-in-out, z-index 0.2s',
                          zIndex: 1,
                        }}
                        onClick={() => openTaskDetail(task)}
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
                        <p
                          className="text-[6px] font-light text-gray-700 break-words overflow-hidden whitespace-nowrap text-ellipsis"
                          title={task.description}
                        >
                          {task.description}
                        </p>
                        <p className="text-[6px] font-semibold text-gray-900">{task.time}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modale d'ajout de tâche */}
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
                    className="task-form-select w-full px-3 py-2 text-base text-black rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
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
                  className="task-form-select w-full px-3 py-2 text-base text-black rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
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

      {/* Modale de détail de tâche */}
      {selectedTask && (
        <div
          className="absolute inset-0 bg-transparent flex items-center justify-center z-[100]"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className={`rounded-xl shadow-2xl w-full max-w-md p-6 relative ${
              selectedTask.priority === 'high'
                ? 'bg-red-50 border-l-4 border-red-600'
                : selectedTask.priority === 'medium'
                ? 'bg-orange-50 border-l-4 border-orange-500'
                : 'bg-green-50 border-l-4 border-green-600'
            }`}
            style={{
              boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
              border: '1px solid #e5e7eb',
            }}
          >
            <button
              onClick={closeTaskDetail}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h2 className={`text-xl font-bold mb-2 ${
              selectedTask.priority === 'high'
                ? 'text-red-600'
                : selectedTask.priority === 'medium'
                ? 'text-orange-500'
                : 'text-green-600'
            }`}>
              {selectedTask.title}
            </h2>
            <p className="mb-2 text-gray-700 break-words whitespace-pre-line max-h-32 overflow-auto">{selectedTask.description}</p>
            <div className="mb-1 text-sm text-gray-500">
              <strong>Date:</strong> {selectedTask.date}
            </div>
            <div className="mb-1 text-sm text-gray-500">
              <strong>Time:</strong> {selectedTask.time}
            </div>
            <div className="mb-1 text-sm text-gray-500">
              <strong>Priority:</strong> {selectedTask.priority}
            </div>
            <button
              onClick={() => {
                deleteTask(selectedTask.id);
                closeTaskDetail();
              }}
              className="mt-4 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              Delete Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveCalendar;