import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import "../styles/LeavesRemaining.css";

const LeavesRemaining = ({ userData }) => {
  // Default data if props not passed
  const defaultUserData = {
    totalLeaves: 30,
    usedLeaves: 12,
    remainingLeaves: 18,
    leaveTypes: [
      { name: 'Annual', used: 8, remaining: 12, total: 20 },
      { name: 'Medical', used: 2, remaining: 8, total: 10 },
      { name: 'Emergency', used: 2, remaining: 3, total: 5 },
    ]
  };

  // Use provided data or fallback to default
  const data = userData || defaultUserData;
  
  // Calculate percentages for the main chart
  const mainChartData = [
    { name: 'Used', value: data.usedLeaves },
    { name: 'Remaining', value: data.remainingLeaves }
  ];

  // Colors
  const COLORS = ['#FF4560', '#00E396'];

  return (
    <div className="leaves-remaining-container">
      <div className="leaves-remaining-header">
        <h2>Leave Entitlement</h2>
        <div className="leaves-remaining-badge">
          <span>{data.remainingLeaves}</span> days remaining
        </div>
      </div>

      <div className="leaves-remaining-content">
        <div className="leaves-chart">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={mainChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {mainChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} days`, '']}
                contentStyle={{
                  backgroundColor: 'rgba(25, 25, 25, 0.9)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white'
                }}
              />
              <Legend 
                layout="vertical" 
                align="right"
                verticalAlign="middle" 
                wrapperStyle={{
                  paddingLeft: '10px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-center-text">
            <div className="total-number">{data.totalLeaves}</div>
            <div className="total-days">Total Days</div>
          </div>
        </div>

        <div className="leave-types-breakdown">
          <h3>Leave Types</h3>
          {data.leaveTypes.map((type, index) => (
            <div className="leave-type-item" key={index}>
              <div className="leave-type-header">
                <span className="leave-type-name">{type.name}</span>
                <span className="leave-type-stats">
                  {type.used}/{type.total} days used
                </span>
              </div>
              <div className="progress-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${(type.used / type.total) * 100}%` }}
                ></div>
              </div>
              <div className="leave-type-remaining">
                <span>{type.remaining} days remaining</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeavesRemaining;