### Kill Server
# In situation where server is hosted on port 3000
fuser -k 3000/tcp
 
### How to Edit User Database
Run from the server/ directory:
node manage-users.js <command> [arguments]
#
Commands:
list 
add <username> <pass>
delete <username> 
reset-password <username> <newpass>
show <user>

### Enter MySQL
sudo mysql -u root -p

### Turning on Backend Auto-restart
How to use:
1. Stop the current server (manually)
2. Start with auto-restart using:
      cd /home/orka/projects/orilink/server
   npm run dev
   
Now whenever you make changes to backend files (.js files in /server/), nodemon will automatically restart the server for you.
Commands:
- npm run dev - Start with auto-restart (development)
- npm start - Start normally (production)
