from collections import OrderedDict
import os, re, fnmatch, random

alphabetFrequencies = {}
ofbDict = {}
charsInFilesCount = 0

def checkFrequency(string, saf):
	dict = {}
	ret = {	'notInAlphabet': [], 'outsideFrequencyBounds': [], 'bandwidth': 0, 'tbandwidth': 0	}
	for s in string:
		if s not in dict:
			dict[s] = 0
		dict[s] += 1
		
	frequencies = []
	sortedKeys = OrderedDict(sorted(dict.items(), key=lambda t: t[0]))
	accepted = True
	for sk in sortedKeys:
		f = dict[sk]
		isInAlphabet = sk in saf
		isFrequencyWithinBounds = False
		if isInAlphabet:
			af = saf[sk]
			isFrequencyWithinBounds = f <= af

		if not isInAlphabet:
			ret['notInAlphabet'].append(sk)
			accepted = False
		if not isFrequencyWithinBounds:
			ret['outsideFrequencyBounds'].append(sk)
			if sk not in ofbDict:
				ofbDict[sk] = 0
			ofbDict[sk] += 1
			accepted = False
	if accepted:
		ret['bandwidth'] += len(string)
	ret['tbandwidth'] += len(string)

	return ret

def setFrequency(string):
	global charsInFilesCount
	for s in string:
		if s not in alphabetFrequencies:
			alphabetFrequencies[s] = 0
		alphabetFrequencies[s] += 1
		charsInFilesCount += 1

def calcFrequencies(maxBlockLength):
	saf = OrderedDict(sorted(alphabetFrequencies.items(), key=lambda t: t[1], reverse=True))
	for k in saf:
		saf[k] = int(round(saf[k]/float(charsInFilesCount) * maxBlockLength))
	return saf

def analyzeMailCorpus():
	dir = './message corpus'
	r = re.compile('\n\n(?!---)(?!\t)(.|\s(?!---))*')
	L = ['Message-ID', 'Date', 'From', 'To', 'Subject', 'Cc', 'Mime-Version', 'Content-Type',
			'Content-Transfer-Encoding', 'Bcc', '---', 'cc', '************************', 'X-']

	messages = []
	files = 520901
	max = 5000
	items = []
	for x in range(1,files):
		items.append(x)
	random.shuffle(items)
	items = items[:max]
	items = sorted(items, reverse=True)
	current = 0
	next = items.pop()
	with open('./emails.txt', 'a') as ofile:
		for root, dirnames, filenames in os.walk(dir):
			for filename in fnmatch.filter(filenames, '*.'):
				print(str(current) + ' ' + str(next) + ' ' + str(len(items)))
				current += 1
				if current != next:
					continue
				if max == 0:
					return messages
				next = items.pop()
				with open(os.path.join(root, filename)) as f:
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
						#ofile.write(line.rstrip() + ' ')
					#ofile.write('\r\n')
					setFrequency(''.join(message))
					messages.append(''.join(message))
					max -= 1
	return messages

def printResults(messages, maxBlockLength, saf):
	nia = 0
	ofb = 0
	bw = 0
	tbw = 0
	nia1 = 0
	ofb1 = 0
	bw1 = 0
	tbw1 = 0
	for i, m in enumerate(messages):
		cap = 200
		si = 0
		if len(m) > cap:
			si = random.randint(0,len(m) - cap)

		r = checkFrequency(m[si:(si+cap)], saf)
		if r['notInAlphabet']:
			nia += 1
		if r['outsideFrequencyBounds']:
			ofb += 1
		bw += r['bandwidth']	
		tbw += min(len(m), cap)

		r = checkFrequency(m[:maxBlockLength/4], saf)
		if r['notInAlphabet']:
			nia1 += 1
		if r['outsideFrequencyBounds']:
			ofb1 += 1
		bw1 += r['bandwidth']	
		tbw1 += min(len(m), maxBlockLength/4)

	mar = 100 - (float(ofb)/len(messages) * 100)
	abr = bw/float(tbw)*100

	mar1 = 100 - (float(ofb1)/len(messages) * 100)
	abr1 = bw1/float(tbw1)*100
	#print('total messages: ' + str(len(messages)))
	#print('messages outside frequency bounds: ' + str(ofb))
	#print('accepted messages: (' + str(maxBlockLength) + ')' + str(100 - (float(ofb)/len(messages) * 100)))
	if tbw > 0:
		print(str(maxBlockLength) + '\t' + str(mar) + '\t' + str(mar/float(maxBlockLength))+ '\t' + str(mar1) + '\t' + str(abr1) + '\t' + str(tbw1))
	#print('letters outside frequency bounds, per message:')
	#sofbDict = OrderedDict(sorted(ofbDict.items(), key=lambda t: t[1], reverse=True))
	#for o in sofbDict:
	#	print(o + ': ' + str(ofbDict[o]))

messages = analyzeMailCorpus()

print('FREQUENCY_ALPHABET')
xsaf = OrderedDict(sorted(alphabetFrequencies.items(), key=lambda t: t[1], reverse=True))
for x in xsaf:
	print(str(x) + '\t' + str(xsaf[x]/float(charsInFilesCount) * 100))
print('Done')

print('TBL\tMAR200\tPUNISHED\tMAR\tABR\tTBR')
for i in range(800, 15001, 200):
	saf = calcFrequencies(i)
	printResults(messages, i, saf)