const { Octokit } = require('@octokit/rest');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config');

// Configuration Octokit avec timeout
const octokit = new Octokit({ 
    auth: config.GITHUB.TOKEN,
    request: { timeout: 15000 } // 15 secondes timeout
});

class SessionManager {
    static async saveSessionToGitHub(number, sessionData) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const fileName = `creds_${sanitizedNumber}.json`;
            
            // Vérifier que les credentials sont valides
            if (!sessionData || typeof sessionData !== 'object') {
                console.warn(`❌ Invalid session data for ${sanitizedNumber}`);
                return false;
            }

            // S'assurer que les credentials sont enregistrés
            if (!sessionData.registered) {
                console.warn(`⚠️ Session data not registered for ${sanitizedNumber}, skipping save`);
                return false;
            }

            let sha = null;
            try {
                const { data } = await octokit.repos.getContent({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: `session/${fileName}`
                });
                sha = data.sha;
                console.log(`📁 Found existing session file for ${sanitizedNumber}`);
            } catch (error) {
                if (error.status !== 404) {
                    console.warn(`⚠️ Error checking existing file: ${error.message}`);
                }
            }
            
            const content = Buffer.from(JSON.stringify(sessionData, null, 2)).toString('base64');
            
            await octokit.repos.createOrUpdateFileContents({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: `session/${fileName}`,
                message: `Update session for ${sanitizedNumber}`,
                content: content,
                sha: sha
            });
            
            console.log(`✅ Session saved to GitHub for ${sanitizedNumber}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save session to GitHub:', error.message);
            return false;
        }
    }
    
    static async restoreSession(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const fileName = `creds_${sanitizedNumber}.json`;
            
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: `session/${fileName}`
            });
            
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            const sessionData = JSON.parse(content);
            
            // Vérifier que la session est valide et enregistrée
            if (sessionData && sessionData.registered && sessionData.me && sessionData.me.id) {
                console.log(`✅ Restored valid session for ${sanitizedNumber}`);
                return sessionData;
            } else {
                console.warn(`⚠️ Restored session for ${sanitizedNumber} is invalid or not registered`);
                return null;
            }
        } catch (error) {
            if (error.status !== 404) {
                console.warn('⚠️ Error restoring session from GitHub:', error.message);
            }
            return null;
        }
    }
    
    static async cleanDuplicateFiles(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: 'session'
            });
            
            const sessionFiles = data.filter(file => 
                file.name.startsWith(`creds_${sanitizedNumber}_`) && file.name.endsWith('.json')
            ).sort((a, b) => {
                const timeA = parseInt(a.name.match(/creds_\d+_(\d+)\.json/)?.[1] || 0);
                const timeB = parseInt(b.name.match(/creds_\d+_(\d+)\.json/)?.[1] || 0);
                return timeB - timeA;
            });
            
            if (sessionFiles.length > 1) {
                for (let i = 1; i < sessionFiles.length; i++) {
                    await octokit.repos.deleteFile({
                        owner: config.GITHUB.OWNER,
                        repo: config.GITHUB.REPO,
                        path: `session/${sessionFiles[i].name}`,
                        message: `Delete duplicate session file for ${sanitizedNumber}`,
                        sha: sessionFiles[i].sha
                    });
                    console.log(`🗑️ Deleted duplicate session file: ${sessionFiles[i].name}`);
                }
            }
        } catch (error) {
            console.error('❌ Failed to clean duplicate files:', error.message);
        }
    }
    
    static async deleteSessionFromGitHub(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: 'session'
            });

            const sessionFiles = data.filter(file =>
                file.name.includes(sanitizedNumber) && file.name.endsWith('.json')
            );

            for (const file of sessionFiles) {
                await octokit.repos.deleteFile({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: `session/${file.name}`,
                    message: `Delete session for ${sanitizedNumber}`,
                    sha: file.sha
                });
                console.log(`🗑️ Deleted GitHub session file: ${file.name}`);
            }

            // Update numbers.json on GitHub
            await this.updateNumberListOnGitHub(sanitizedNumber, true);
            console.log(`✅ Session completely deleted for ${sanitizedNumber}`);

        } catch (error) {
            console.error('❌ Failed to delete session from GitHub:', error.message);
        }
    }
    
    static async loadUserConfig(number) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const configPath = `session/config_${sanitizedNumber}.json`;
            
            const { data } = await octokit.repos.getContent({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: configPath
            });

            const content = Buffer.from(data.content, 'base64').toString('utf8');
            const userConfig = JSON.parse(content);
            
            console.log(`✅ Loaded user config for ${sanitizedNumber}`);
            return { ...config, ...userConfig };
        } catch (error) {
            console.log(`ℹ️ No configuration found for ${number}, using default config`);
            return { ...config };
        }
    }
    
    static async updateUserConfig(number, newConfig) {
        try {
            const sanitizedNumber = number.replace(/[^0-9]/g, '');
            const configPath = `session/config_${sanitizedNumber}.json`;
            let sha = null;

            try {
                const { data } = await octokit.repos.getContent({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: configPath
                });
                sha = data.sha;
            } catch (error) {
                // Config file doesn't exist yet
            }

            await octokit.repos.createOrUpdateFileContents({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: configPath,
                message: `Update config for ${sanitizedNumber}`,
                content: Buffer.from(JSON.stringify(newConfig, null, 2)).toString('base64'),
                sha
            });
            console.log(`✅ Updated config for ${sanitizedNumber}`);
        } catch (error) {
            console.error('❌ Failed to update config:', error.message);
            throw error;
        }
    }
    
    static async updateNumberListOnGitHub(number, remove = false) {
        const sanitizedNumber = number.replace(/[^0-9]/g, '');
        const pathOnGitHub = 'session/numbers.json';
        let numbers = [];
        let sha = null;

        try {
            const { data } = await octokit.repos.getContent({ 
                owner: config.GITHUB.OWNER, 
                repo: config.GITHUB.REPO, 
                path: pathOnGitHub 
            });
            const content = Buffer.from(data.content, 'base64').toString('utf8');
            numbers = JSON.parse(content);
            sha = data.sha;

            if (remove) {
                numbers = numbers.filter(n => n !== sanitizedNumber);
            } else if (!numbers.includes(sanitizedNumber)) {
                numbers.push(sanitizedNumber);
            }

            await octokit.repos.createOrUpdateFileContents({
                owner: config.GITHUB.OWNER,
                repo: config.GITHUB.REPO,
                path: pathOnGitHub,
                message: remove ? `Remove ${sanitizedNumber} from numbers list` : `Add ${sanitizedNumber} to numbers list`,
                content: Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64'),
                sha: sha
            });
            
            console.log(`✅ ${remove ? 'Removed' : 'Added'} ${sanitizedNumber} to GitHub numbers.json`);
        } catch (err) {
            if (err.status === 404 && !remove) {
                numbers = [sanitizedNumber];
                await octokit.repos.createOrUpdateFileContents({
                    owner: config.GITHUB.OWNER,
                    repo: config.GITHUB.REPO,
                    path: pathOnGitHub,
                    message: `Create numbers.json with ${sanitizedNumber}`,
                    content: Buffer.from(JSON.stringify(numbers, null, 2)).toString('base64')
                });
                console.log(`📁 Created GitHub numbers.json with ${sanitizedNumber}`);
            } else {
                console.error('❌ Failed to update numbers.json:', err.message);
            }
        }
    }
}

module.exports = SessionManager;
