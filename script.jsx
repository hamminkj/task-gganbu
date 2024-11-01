import * as React from "react";
import { createRoot } from "react-dom/client";
import { SparkApp, PageContainer, Input, Button, Select, Textarea, Card } from "@github/spark/components";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";

function App() {
  const [tasks, setTasks] = React.useState(() => {
    const storedTasks = localStorage.getItem('tasks');
    return storedTasks ? JSON.parse(storedTasks) : [];
  });
  const [newTask, setNewTask] = React.useState("");
  const [category, setCategory] = React.useState("admin");
  const [points, setPoints] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [laserPosition, setLaserPosition] = React.useState(50);
  const [firing, setFiring] = React.useState(false);
  const [dailyScore, setDailyScore] = React.useState(() => {
    const storedScore = localStorage.getItem('dailyScore');
    return storedScore ? JSON.parse(storedScore) : { date: new Date().toDateString(), score: 0 };
  });

  const tallagSound = React.useRef(new Audio("https://github.com/octonion/static/raw/master/tallag.mp3"));

  React.useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  React.useEffect(() => {
    localStorage.setItem('dailyScore', JSON.stringify(dailyScore));
  }, [dailyScore]);

  React.useEffect(() => {
    const checkAndResetDailyScore = () => {
      const today = new Date().toDateString();
      if (dailyScore.date !== today) {
        setDailyScore({ date: today, score: 0 });
      }
    };

    checkAndResetDailyScore(); // Check when component mounts

    const intervalId = setInterval(checkAndResetDailyScore, 60000); // Check every minute

    return () => clearInterval(intervalId); // Clean up interval on unmount
  }, [dailyScore]);

  const findAvailablePosition = (tasks) => {
    const gridSize = 10; // % of width
    const maxAttempts = 100;
    
    for (let i = 0; i < maxAttempts; i++) {
      const position = Math.floor(Math.random() * (100 / gridSize)) * gridSize;
      const isOverlapping = tasks.some(task => 
        Math.abs(task.position - position) < gridSize
      );
      
      if (!isOverlapping) {
        return position;
      }
    }
    
    // If no position found, return a random position as fallback
    return Math.random() * 80 + 10;
  };

  const addTask = () => {
    if (newTask.trim() !== "") {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const position = findAvailablePosition(tasks);
      setTasks([...tasks, { 
        id: Date.now(), 
        text: newTask, 
        timestamp: timestamp,
        category: category,
        points: points,
        notes: notes,
        position: position,
        completed: null
      }]);
      setNewTask("");
      setPoints(1);
      setNotes("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addTask();
    }
  };

  const moveLaser = (e) => {
    const containerRect = e.currentTarget.getBoundingClientRect();
    const newPosition = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    setLaserPosition(newPosition);
  };

  const fireLaser = () => {
    setFiring(true);
    setTimeout(() => {
      setFiring(false);
      const hitTask = tasks.find(task => 
        Math.abs(task.position - laserPosition) < 10 && !task.completed
      );
      if (hitTask) {
        const now = new Date();
        const completedTimestamp = now.toLocaleString();
        setTasks(tasks.map(task => 
          task.id === hitTask.id 
            ? { ...task, completed: completedTimestamp } 
            : task
        ));
        updateDailyScore(hitTask.points);
        tallagSound.current.play(); // Play the "탈락" sound
      }
    }, 500);
  };

  const updateDailyScore = (pointsToAdd) => {
    const today = new Date().toDateString();
    if (dailyScore.date === today) {
      setDailyScore(prev => ({ ...prev, score: prev.score + pointsToAdd }));
    } else {
      setDailyScore({ date: today, score: pointsToAdd });
    }
  };

  const downloadCSV = () => {
    const headers = ["Task", "Category", "Points", "Created", "Completed", "Notes"];
    const csvContent = [
      headers.join(","),
      ...tasks.map(task => 
        `"${task.text}","${task.category}","${task.points}","${task.timestamp}","${task.completed || ''}","${task.notes}"`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const dateTimeString = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.setAttribute("href", url);
      link.setAttribute("download", `tasks_${dateTimeString}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getTaskIcon = (points) => {
    switch(points) {
      case 1:
        return (
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-yellow-500">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
          </svg>
        );
      case 2:
        return (
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-green-500">
            <polygon fill="currentColor" points="12 2 22 22 2 22" />
          </svg>
        );
      case 3:
        return (
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-yellow-500">
            <path fill="currentColor" d="M12 2.58l2.95 5.98 6.59.96-4.77 4.65 1.13 6.57L12 17.62l-5.9 3.12 1.13-6.57L2.46 9.52l6.59-.96L12 2.58z"/>
          </svg>
        );
      case 4:
        return <span role="img" aria-label="umbrella" className="text-5xl">☂️</span>;
      default:
        return (
          <svg viewBox="0 0 24 24" className="w-16 h-16 text-yellow-500">
            <circle cx="12" cy="12" r="10" fill="currentColor" />
          </svg>
        );
    }
  };

  const deleteAllData = () => {
    if (window.confirm("Are you sure you want to delete all stored data? This action cannot be undone.")) {
      localStorage.removeItem('tasks');
      localStorage.removeItem('dailyScore');
      setTasks([]);
      setDailyScore({ date: new Date().toDateString(), score: 0 });
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600">
            Task Gganbu 깐부
          </h1>
          <Button
            onClick={deleteAllData}
            variant="secondary"
            className="!p-2"
            icon={<ExclamationTriangleIcon className="w-5 h-5 text-red-500" />}
            aria-label="Delete all data"
          />
        </div>
        <div className="flex space-x-2">
          <Input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter new task"
            className="w-1/3"
          />
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="prep">Prep</option>
            <option value="teach">Teach</option>
          </Select>
          <Select 
            value={points} 
            onChange={(e) => setPoints(parseInt(e.target.value))}
            className="w-20"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </Select>
          <Button onClick={addTask}>Add Task</Button>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={3}
        />
        <Button onClick={downloadCSV}>Download CSV</Button>
        <div className="relative h-80 bg-gray-200 rounded" onMouseMove={moveLaser} onClick={fireLaser}>
          {tasks.filter(task => !task.completed).map((task) => (
            <div
              key={task.id}
              className="absolute top-0"
              style={{ left: `${task.position}%`, transform: 'translateX(-50%)' }}
            >
              {getTaskIcon(task.points)}
              <div className="text-lg mt-2 font-semibold text-black">{task.text}</div>
            </div>
          ))}
          <div
            className="absolute bottom-0 w-8 h-8 transform -translate-x-1/2"
            style={{ left: `${laserPosition}%` }}
          >
            <span role="img" aria-label="girl" className="text-4xl">👧</span>
            <div
              className={`absolute bottom-full left-1/2 bg-red-500 ${firing ? 'animate-pulse' : ''}`}
              style={{ 
                transform: 'translateX(-50%)', 
                width: '2px', 
                height: '100%',
                boxShadow: '0 0 5px 1px rgba(255, 0, 0, 0.7)'
              }}
            ></div>
          </div>
        </div>
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">Daily Score</div>
            <span role="img" aria-label="squid" className="text-5xl">🦑</span>
          </div>
          <div className="text-4xl font-extrabold mt-2">{dailyScore.score}</div>
          <div className="text-lg mt-2">Keep on tallaging, 깐부</div>
        </Card>
      </div>
    </PageContainer>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(
  <SparkApp>
    <App />
  </SparkApp>
);
