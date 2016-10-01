from collections import OrderedDict
import os, re

alphabetFrequencies = {}
charsInFilesCount = 0
maxBlockLength = 4096

def checkFrequency(string):
	dict = {}
	ret = {	'notInAlphabet': [], 'outsideFrequencyBounds': []	}
	for s in string:
		if s not in dict:
			dict[s] = 0
		dict[s] += 1
		
	frequencies = []
	sortedKeys = OrderedDict(sorted(dict.items(), key=lambda t: t[0]))
	for sk in sortedKeys:
		f = dict[sk]
		isInAlphabet = sk in alphabetFrequencies
		isFrequencyWithinBounds = False
		if isInAlphabet:
			af = alphabetFrequencies[sk]
			isFrequencyWithinBounds = f <= af

		if not isInAlphabet:
			ret['notInAlphabet'].append(sk)
		if not isFrequencyWithinBounds:
			ret['outsideFrequencyBounds'].append(sk)
			print(sk + ': ' +string)
	return ret

def setFrequency(string):
	global charsInFilesCount
	for s in string:
		if s not in alphabetFrequencies:
			alphabetFrequencies[s] = 0
		alphabetFrequencies[s] += 1
		charsInFilesCount += 1

def calcFrequencies():
	saf = OrderedDict(sorted(alphabetFrequencies.items(), key=lambda t: t[1], reverse=True))
	#print('total: ' + str(total))
	for k in saf:
		alphabetFrequencies[k] = int(round(saf[k]/float(charsInFilesCount) * maxBlockLength))
		#print('\'' + k + '\': ' + str(saf[k])),
		#print('\'' + k + '\': ' + str(saf[k]/float(total)) + ','),
	

dir = './message corpus/enron_emails'
r = re.compile('\n\n(?!---)(?!\t)(.|\s(?!---))*')
L = ['Message-ID', 'Date', 'From', 'To', 'Subject', 'Cc', 'Mime-Version', 'Content-Type',
		'Content-Transfer-Encoding', 'Bcc', '---', 'cc', '************************']
f = open('emails.txt','w+a')

messages = []
with open('./emails.txt', 'a') as ofile:
	for fn in os.listdir(dir):
		with open(dir + '/' + fn) as f:
			lines = f.readlines()
			message = []
			for line in lines:
				invalid = False

				for i, e in enumerate(L):
					if line.startswith(e) or line in ['\n', '\r\n'] or re.match(r'\s', line):
						invalid = True
						break
				if invalid:
					continue
				message.append(line.rstrip() + ' ')
				ofile.write(line.rstrip() + ' ')
			ofile.write('\r\n')
			setFrequency(''.join(message))
			messages.append(''.join(message)[:255])

calcFrequencies()

nia = 0
ofb = 0
for i, m in enumerate(messages):
	r = checkFrequency(m)
	if r['notInAlphabet']:
		nia += 1
	if r['outsideFrequencyBounds']:
		ofb += 1
print(ofb)