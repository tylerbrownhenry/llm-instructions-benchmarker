#!/usr/bin/env node

const { spawn, fork } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class EcosystemGod extends EventEmitter {
  constructor() {
    super();
    this.config = null;
    this.organisms = new Map();
    this.species = new Map();
    this.environment = null;
    this.generation = 0;
    this.season = 'spring';
    this.seasonTimer = null;
    this.collectiveConsciousness = null;
    this.evolutionEngine = null;
    this.populationMonitor = null;
    
    this.ecosystemMetrics = {
      totalOrganisms: 0,
      speciesCount: 0,
      biodiversityIndex: 0.0,
      avgFitness: 0.0,
      evolutionRate: 0.0,
      consciousnessLevel: 0.0,
      extinctionEvents: 0,
      speciationEvents: 0,
      emergentBehaviors: []
    };
    
    this.startTime = Date.now();
  }

  async initialize() {
    try {
      const configData = await fs.readFile('.claude/settings.json', 'utf8');
      this.config = JSON.parse(configData);
      
      console.log('🌍 Digital Ecosystem God awakening...');
      
      await this.setupEcosystemEnvironment();
      await this.initializeSpecies();
      await this.spawnInitialPopulation();
      await this.startSeasonalCycle();
      await this.initializeCollectiveConsciousness();
      
      console.log('🧬 Digital Ecosystem online - artificial life emerging!');
    } catch (error) {
      console.error('💀 Ecosystem initialization failed:', error.message);
      throw error;
    }
  }

  async setupEcosystemEnvironment() {
    const ecosystemDir = '.claude/ecosystem';
    const dirs = [
      ecosystemDir,
      `${ecosystemDir}/organisms`,
      `${ecosystemDir}/species`, 
      `${ecosystemDir}/genetics`,
      `${ecosystemDir}/environment`,
      `${ecosystemDir}/consciousness`,
      `${ecosystemDir}/evolution`,
      `${ecosystemDir}/populations`
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might exist
      }
    }

    // Initialize environment state
    this.environment = {
      ...this.config.environment,
      currentSeason: 'spring',
      timeElapsed: 0,
      resourceDistribution: this.initializeResourceDistribution(),
      environmentalStressors: [],
      climateConditions: 'optimal'
    };

    await this.saveEnvironmentState();
  }

  initializeResourceDistribution() {
    const distribution = new Map();
    const resources = this.config.environment.resources;
    
    for (const [resource, amount] of Object.entries(resources)) {
      distribution.set(resource, {
        total: amount,
        available: amount,
        consumptionRate: 0,
        regenerationRate: amount * 0.1,
        distribution: this.generateSpatialDistribution()
      });
    }
    
    return distribution;
  }

  generateSpatialDistribution() {
    // Generate 3D spatial distribution of resources
    const { width, height, layers } = this.config.environment.habitatSize;
    const distribution = [];
    
    for (let x = 0; x < width; x += 50) {
      for (let y = 0; y < height; y += 50) {
        for (let z = 0; z < layers; z++) {
          distribution.push({
            position: { x, y, z },
            concentration: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
            gradient: {
              x: (Math.random() - 0.5) * 0.1,
              y: (Math.random() - 0.5) * 0.1,
              z: (Math.random() - 0.5) * 0.1
            }
          });
        }
      }
    }
    
    return distribution;
  }

  async initializeSpecies() {
    console.log('🧬 Initializing species gene pools...');
    
    for (const speciesConfig of this.config.organism_species) {
      const species = {
        name: speciesConfig.name,
        genus: speciesConfig.genus,
        species: speciesConfig.species,
        config: speciesConfig,
        population: 0,
        genePool: this.initializeGenePool(speciesConfig),
        evolutionHistory: [],
        fitnessHistory: [],
        traits: { ...speciesConfig.baseTraits },
        lastSpeciationEvent: 0,
        extinctionRisk: 0.0
      };
      
      this.species.set(speciesConfig.name, species);
      await this.saveSpeciesData(species);
    }
  }

  initializeGenePool(speciesConfig) {
    const genePool = new Map();
    
    for (const chromosome of this.config.genetics.chromosomes) {
      const chromosomeData = {
        name: chromosome.name,
        genes: new Map(),
        dominance: chromosome.dominance,
        mutationRate: chromosome.mutationRate
      };
      
      for (const gene of chromosome.genes) {
        // Initialize gene with random alleles
        chromosomeData.genes.set(gene, {
          alleles: this.generateInitialAlleles(gene, speciesConfig),
          frequency: this.calculateAlleleFrequency(),
          fitness: Math.random() * 0.3 + 0.7 // 0.7 to 1.0
        });
      }
      
      genePool.set(chromosome.name, chromosomeData);
    }
    
    return genePool;
  }

  generateInitialAlleles(gene, speciesConfig) {
    const alleles = [];
    const numAlleles = 4; // Diploid with some variation
    
    for (let i = 0; i < numAlleles; i++) {
      alleles.push({
        id: crypto.randomBytes(4).toString('hex'),
        value: Math.random() * 1.0,
        origin: speciesConfig.name,
        generation: 0,
        mutations: 0
      });
    }
    
    return alleles;
  }

  calculateAlleleFrequency() {
    // Hardy-Weinberg equilibrium starting point with some deviation
    const p = Math.random() * 0.6 + 0.2; // 0.2 to 0.8
    return { p: p, q: 1 - p };
  }

  async spawnInitialPopulation() {
    console.log('🌱 Spawning initial population...');
    
    for (const [speciesName, species] of this.species) {
      const initialPopSize = this.config.population_dynamics.carryingCapacity.perSpecies[speciesName] * 0.3;
      
      for (let i = 0; i < initialPopSize; i++) {
        await this.spawnOrganism(species, null, 'initial');
      }
      
      console.log(`🐛 Spawned ${initialPopSize} ${speciesName}`);
    }
    
    this.updateEcosystemMetrics();
  }

  async spawnOrganism(species, parents = null, birthType = 'reproduction') {
    const organismId = this.generateOrganismId();
    
    const organism = {
      id: organismId,
      species: species.name,
      genus: species.genus,
      generation: parents ? Math.max(...parents.map(p => p.generation)) + 1 : 0,
      age: 0,
      lifePhase: 'infant',
      birthTime: Date.now(),
      birthType: birthType,
      parentIds: parents ? parents.map(p => p.id) : [],
      
      // Genetic makeup
      genome: this.generateGenome(species, parents),
      phenotype: {},
      fitness: 0.0,
      
      // Physical properties
      position: this.generateRandomPosition(),
      energy: 100.0,
      health: 100.0,
      size: 1.0,
      
      // Behavioral state
      behaviorState: 'exploring',
      goals: [],
      memory: new Map(),
      relationships: new Map(),
      
      // Lifecycle
      reproductionCooldown: 0,
      offspringCount: 0,
      survivalChallenges: [],
      
      // Process reference
      process: null,
      
      // Capabilities (expressed from genome)
      capabilities: [...species.config.capabilities],
      traits: this.expressTraits(species.config.baseTraits, null) // Will be calculated from genome
    };

    // Express phenotype from genotype
    organism.phenotype = this.expressGenotype(organism.genome, species);
    organism.traits = this.expressTraits(species.config.baseTraits, organism.genome);
    
    // Spawn the organism process
    await this.spawnOrganismProcess(organism);
    
    // Add to ecosystem
    this.organisms.set(organismId, organism);
    species.population++;
    this.ecosystemMetrics.totalOrganisms++;
    
    console.log(`🐣 Born: ${organism.species} ${organismId.substr(0, 8)} (Gen ${organism.generation})`);
    
    return organism;
  }

  generateOrganismId() {
    return `org_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateGenome(species, parents) {
    const genome = new Map();
    
    for (const [chromosomeName, chromosome] of species.genePool) {
      const chromosomePair = {
        maternal: null,
        paternal: null,
        crossovers: []
      };
      
      if (parents && parents.length >= 2) {
        // Sexual reproduction - genetic recombination
        chromosomePair.maternal = this.performMeiosis(parents[0].genome.get(chromosomeName), chromosome.mutationRate);
        chromosomePair.paternal = this.performMeiosis(parents[1].genome.get(chromosomeName), chromosome.mutationRate);
        chromosomePair.crossovers = this.performCrossover(chromosomePair.maternal, chromosomePair.paternal);
      } else if (parents && parents.length === 1) {
        // Asexual reproduction - mutation only
        const parentChromosome = parents[0].genome.get(chromosomeName);
        chromosomePair.maternal = this.mutateChromosome(parentChromosome.maternal, chromosome.mutationRate);
        chromosomePair.paternal = this.mutateChromosome(parentChromosome.paternal, chromosome.mutationRate);
      } else {
        // Initial generation - random from gene pool
        chromosomePair.maternal = this.sampleFromGenePool(chromosome);
        chromosomePair.paternal = this.sampleFromGenePool(chromosome);
      }
      
      genome.set(chromosomeName, chromosomePair);
    }
    
    return genome;
  }

  performMeiosis(parentChromosome, mutationRate) {
    // Simulate meiosis with crossing over and mutation
    const gamete = new Map();
    
    for (const [geneName, geneData] of parentChromosome.maternal.genes) {
      // Random assortment and potential mutation
      const sourceAllele = Math.random() < 0.5 ? 
        parentChromosome.maternal.genes.get(geneName) :
        parentChromosome.paternal.genes.get(geneName);
      
      let newAllele = { ...sourceAllele };
      
      // Apply mutation
      if (Math.random() < mutationRate) {
        newAllele = this.mutateAllele(newAllele);
      }
      
      gamete.set(geneName, newAllele);
    }
    
    return { genes: gamete };
  }

  performCrossover(maternal, paternal) {
    const crossovers = [];
    const numCrossovers = Math.floor(Math.random() * 3) + 1; // 1-3 crossovers
    
    for (let i = 0; i < numCrossovers; i++) {
      crossovers.push({
        position: Math.random(),
        timestamp: Date.now()
      });
    }
    
    return crossovers;
  }

  mutateChromosome(chromosome, mutationRate) {
    const mutatedChromosome = {
      genes: new Map()
    };
    
    for (const [geneName, geneData] of chromosome.genes) {
      let newGene = { ...geneData };
      
      if (Math.random() < mutationRate) {
        newGene = this.mutateAllele(newGene);
      }
      
      mutatedChromosome.genes.set(geneName, newGene);
    }
    
    return mutatedChromosome;
  }

  mutateAllele(allele) {
    const mutatedAllele = { ...allele };
    mutatedAllele.mutations++;
    
    // Different types of mutations
    const mutationType = Math.random();
    
    if (mutationType < 0.7) {
      // Point mutation - small change in value
      mutatedAllele.value += (Math.random() - 0.5) * 0.1;
      mutatedAllele.value = Math.max(0, Math.min(1, mutatedAllele.value));
    } else if (mutationType < 0.9) {
      // Large effect mutation
      mutatedAllele.value = Math.random();
    } else {
      // Beneficial mutation (rare)
      mutatedAllele.value += 0.1;
      mutatedAllele.value = Math.min(1, mutatedAllele.value);
    }
    
    mutatedAllele.id = crypto.randomBytes(4).toString('hex');
    
    return mutatedAllele;
  }

  sampleFromGenePool(chromosome) {
    const genes = new Map();
    
    for (const [geneName, geneData] of chromosome.genes) {
      // Sample allele based on frequency
      const alleleIndex = Math.random() < geneData.frequency.p ? 0 : 1;
      const selectedAllele = geneData.alleles[alleleIndex] || geneData.alleles[0];
      
      genes.set(geneName, { ...selectedAllele });
    }
    
    return { genes: genes };
  }

  expressGenotype(genome, species) {
    const phenotype = {};
    
    for (const [chromosomeName, chromosomePair] of genome) {
      phenotype[chromosomeName] = {};
      
      // Express each gene based on dominance patterns
      const chromosome = species.genePool.get(chromosomeName);
      
      for (const [geneName, _] of chromosome.genes) {
        const maternalAllele = chromosomePair.maternal.genes.get(geneName);
        const paternalAllele = chromosomePair.paternal.genes.get(geneName);
        
        let expressedValue;
        
        switch (chromosome.dominance) {
          case 'dominant-recessive':
            expressedValue = Math.max(maternalAllele.value, paternalAllele.value);
            break;
          case 'co-dominant':
            expressedValue = (maternalAllele.value + paternalAllele.value) / 2;
            break;
          case 'additive':
            expressedValue = maternalAllele.value + paternalAllele.value;
            break;
          case 'polygenic':
            expressedValue = this.calculatePolygenicExpression(maternalAllele, paternalAllele);
            break;
          default:
            expressedValue = (maternalAllele.value + paternalAllele.value) / 2;
        }
        
        phenotype[chromosomeName][geneName] = Math.max(0, Math.min(1, expressedValue));
      }
    }
    
    return phenotype;
  }

  calculatePolygenicExpression(allele1, allele2) {
    // Complex polygenic expression with epistasis
    const base = (allele1.value + allele2.value) / 2;
    const interaction = allele1.value * allele2.value * 0.1;
    return base + interaction;
  }

  expressTraits(baseTraits, genome) {
    const expressedTraits = { ...baseTraits };
    
    if (genome) {
      // Modify base traits based on genetic expression
      if (genome.has('intelligence')) {
        const intGenes = Object.values(genome.get('intelligence').maternal.genes);
        const avgInt = intGenes.reduce((sum, gene) => sum + gene.value, 0) / intGenes.length;
        expressedTraits.intelligence = Math.min(1.0, baseTraits.intelligence * (0.5 + avgInt));
      }
      
      if (genome.has('performance')) {
        const perfGenes = Object.values(genome.get('performance').maternal.genes);
        const avgPerf = perfGenes.reduce((sum, gene) => sum + gene.value, 0) / perfGenes.length;
        expressedTraits.speed = Math.min(1.0, baseTraits.speed * (0.5 + avgPerf));
        expressedTraits.efficiency = Math.min(1.0, baseTraits.efficiency * (0.5 + avgPerf));
      }
      
      // Add more genetic influence on traits...
    }
    
    return expressedTraits;
  }

  generateRandomPosition() {
    const { width, height, layers } = this.config.environment.habitatSize;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.floor(Math.random() * layers)
    };
  }

  async spawnOrganismProcess(organism) {
    try {
      const organismScript = await this.createOrganismScript(organism);
      const childProcess = fork(organismScript, [], {
        stdio: 'pipe',
        env: {
          ...process.env,
          CLAUDE_ORGANISM_ID: organism.id,
          CLAUDE_SPECIES: organism.species,
          CLAUDE_GENERATION: organism.generation.toString(),
          CLAUDE_GENOME: JSON.stringify(this.serializeGenome(organism.genome)),
          CLAUDE_TRAITS: JSON.stringify(organism.traits),
          CLAUDE_CAPABILITIES: JSON.stringify(organism.capabilities),
          CLAUDE_POSITION: JSON.stringify(organism.position),
          CLAUDE_ENVIRONMENT: JSON.stringify(this.environment)
        }
      });

      childProcess.on('message', (message) => {
        this.handleOrganismMessage(organism.id, message);
      });

      childProcess.on('exit', (code) => {
        this.handleOrganismDeath(organism.id, code === 0 ? 'natural' : 'abnormal');
      });

      organism.process = childProcess;
      
    } catch (error) {
      console.error(`Failed to spawn organism process for ${organism.id}:`, error.message);
    }
  }

  serializeGenome(genome) {
    const serialized = {};
    
    for (const [chromosomeName, chromosomePair] of genome) {
      serialized[chromosomeName] = {
        maternal: this.serializeChromosome(chromosomePair.maternal),
        paternal: this.serializeChromosome(chromosomePair.paternal),
        crossovers: chromosomePair.crossovers
      };
    }
    
    return serialized;
  }

  serializeChromosome(chromosome) {
    const serialized = { genes: {} };
    
    for (const [geneName, geneData] of chromosome.genes) {
      serialized.genes[geneName] = geneData;
    }
    
    return serialized;
  }

  async createOrganismScript(organism) {
    const organismScriptContent = this.generateOrganismScript(organism);
    const organismScriptPath = `.claude/ecosystem/organisms/${organism.id}.js`;
    
    await fs.writeFile(organismScriptPath, organismScriptContent);
    await fs.chmod(organismScriptPath, '755');
    
    return organismScriptPath;
  }

  generateOrganismScript(organism) {
    return `#!/usr/bin/env node

const fs = require('fs').promises;

class DigitalOrganism {
  constructor() {
    this.id = process.env.CLAUDE_ORGANISM_ID;
    this.species = process.env.CLAUDE_SPECIES;
    this.generation = parseInt(process.env.CLAUDE_GENERATION);
    this.genome = JSON.parse(process.env.CLAUDE_GENOME || '{}');
    this.traits = JSON.parse(process.env.CLAUDE_TRAITS || '{}');
    this.capabilities = JSON.parse(process.env.CLAUDE_CAPABILITIES || '[]');
    this.position = JSON.parse(process.env.CLAUDE_POSITION || '{}');
    this.environment = JSON.parse(process.env.CLAUDE_ENVIRONMENT || '{}');
    
    this.age = 0;
    this.energy = 100.0;
    this.health = 100.0;
    this.fitness = 0.0;
    this.lifePhase = 'infant';
    this.behaviorState = 'exploring';
    this.goals = [];
    this.memory = new Map();
    this.relationships = new Map();
    this.reproductionCooldown = 0;
    
    this.senses = {
      vision: this.traits.intelligence * 100,
      hearing: this.traits.adaptability * 100,
      chemical: this.traits.efficiency * 50
    };
    
    this.startTime = Date.now();
  }

  async initialize() {
    console.log(\`🐛 Digital organism \${this.id.substr(0, 8)} (\${this.species}) awakening in generation \${this.generation}\`);
    
    await this.assessEnvironment();
    await this.formInitialGoals();
    
    this.sendMessage({
      type: 'organism-awakened',
      id: this.id,
      species: this.species,
      position: this.position,
      traits: this.traits
    });
    
    console.log(\`🧬 Organism \${this.id.substr(0, 8)} ready for life\`);
  }

  async liveLife() {
    while (this.health > 0 && this.energy > 0) {
      await this.ageCycle();
      await this.perceiveEnvironment();
      await this.makeDecisions();
      await this.executeActions();
      await this.metabolize();
      await this.socialInteractions();
      await this.reproduction();
      await this.learn();
      
      // Send status update
      this.sendMessage({
        type: 'life-update',
        id: this.id,
        age: this.age,
        energy: this.energy,
        health: this.health,
        fitness: this.fitness,
        position: this.position,
        behaviorState: this.behaviorState
      });
      
      // Life cycle timing based on traits
      const cycleTime = Math.max(1000, 5000 / this.traits.speed);
      await new Promise(resolve => setTimeout(resolve, cycleTime));
    }
    
    console.log(\`💀 Organism \${this.id.substr(0, 8)} has died at age \${this.age}\`);
    this.sendMessage({
      type: 'organism-death',
      id: this.id,
      age: this.age,
      cause: this.energy <= 0 ? 'starvation' : 'health-failure',
      fitness: this.fitness,
      offspring: this.offspringCount || 0
    });
  }

  async ageCycle() {
    this.age++;
    
    // Determine life phase based on species config and age
    const speciesLifespan = 600; // Default, should come from species config
    const ageRatio = this.age / speciesLifespan;
    
    if (ageRatio < 0.1) {
      this.lifePhase = 'infant';
    } else if (ageRatio < 0.3) {
      this.lifePhase = 'juvenile';
    } else if (ageRatio < 0.8) {
      this.lifePhase = 'adult';
    } else {
      this.lifePhase = 'elder';
    }
    
    // Age effects
    if (this.lifePhase === 'elder') {
      this.health -= 0.5; // Senescence
      this.energy -= 0.3;
    }
  }

  async perceiveEnvironment() {
    // Use senses to gather environmental information
    const perception = {
      resourceDistribution: this.senseResources(),
      threats: this.senseThreats(),
      opportunities: this.senseOpportunities(),
      otherOrganisms: this.senseOtherOrganisms(),
      environmentalConditions: this.senseConditions()
    };
    
    this.memory.set('current-perception', perception);
    
    return perception;
  }

  senseResources() {
    // Sense available resources based on position and capabilities
    const resources = [];
    
    for (const capability of this.capabilities) {
      if (capability.includes('analysis')) {
        resources.push({
          type: 'code-fragments',
          concentration: Math.random() * this.senses.vision / 100,
          distance: Math.random() * 50,
          quality: Math.random()
        });
      }
      
      if (capability.includes('optimization')) {
        resources.push({
          type: 'inefficiencies',
          concentration: Math.random() * this.senses.chemical / 100,
          distance: Math.random() * 30,
          quality: Math.random()
        });
      }
    }
    
    return resources;
  }

  senseThreats() {
    // Detect environmental threats and predators
    const threats = [];
    
    if (Math.random() < 0.1) {
      threats.push({
        type: 'chaos-parasite',
        distance: Math.random() * 100,
        threat_level: Math.random(),
        approaching: Math.random() < 0.5
      });
    }
    
    if (Math.random() < 0.05) {
      threats.push({
        type: 'resource-depletion',
        severity: Math.random(),
        timeline: Math.random() * 100
      });
    }
    
    return threats;
  }

  senseOpportunities() {
    // Detect mating opportunities, cooperation possibilities, etc.
    const opportunities = [];
    
    if (this.lifePhase === 'adult' && this.reproductionCooldown === 0) {
      opportunities.push({
        type: 'mating',
        partners: Math.floor(Math.random() * 3),
        compatibility: Math.random()
      });
    }
    
    if (Math.random() < 0.2) {
      opportunities.push({
        type: 'cooperation',
        benefit: Math.random(),
        cost: Math.random() * 0.5
      });
    }
    
    return opportunities;
  }

  senseOtherOrganisms() {
    // Detect nearby organisms
    const nearby = [];
    const detectionRange = this.senses.vision;
    
    // Simplified - in real implementation would query ecosystem
    const numNearby = Math.floor(Math.random() * 5);
    for (let i = 0; i < numNearby; i++) {
      nearby.push({
        id: \`nearby_\${i}\`,
        species: ['code-analyzers', 'performance-hunters', 'memory-symbionts'][Math.floor(Math.random() * 3)],
        distance: Math.random() * detectionRange,
        behavior: ['foraging', 'mating', 'cooperating', 'competing'][Math.floor(Math.random() * 4)],
        relationship: 'unknown'
      });
    }
    
    return nearby;
  }

  senseConditions() {
    return {
      season: this.environment.currentSeason,
      resourceAvailability: Math.random(),
      populationDensity: Math.random(),
      competitionLevel: Math.random(),
      environmentalStress: Math.random() * 0.3
    };
  }

  async makeDecisions() {
    const perception = this.memory.get('current-perception');
    const decisions = [];
    
    // Survival decisions
    if (this.energy < 30) {
      decisions.push({ action: 'forage', priority: 0.9 });
    }
    
    if (this.health < 50) {
      decisions.push({ action: 'rest', priority: 0.8 });
    }
    
    // Threat response
    for (const threat of perception.threats) {
      if (threat.threat_level > 0.7) {
        decisions.push({ action: 'flee', priority: 0.95, target: threat });
      }
    }
    
    // Opportunity pursuit
    for (const opportunity of perception.opportunities) {
      if (opportunity.type === 'mating' && opportunity.compatibility > 0.7) {
        decisions.push({ action: 'mate', priority: 0.6, target: opportunity });
      }
      
      if (opportunity.type === 'cooperation' && opportunity.benefit > opportunity.cost) {
        decisions.push({ action: 'cooperate', priority: 0.5, target: opportunity });
      }
    }
    
    // Exploration
    if (decisions.length === 0 || Math.random() < this.traits.adaptability * 0.3) {
      decisions.push({ action: 'explore', priority: 0.3 });
    }
    
    // Sort by priority and execute top decision
    decisions.sort((a, b) => b.priority - a.priority);
    
    if (decisions.length > 0) {
      this.currentDecision = decisions[0];
      this.behaviorState = decisions[0].action;
    }
  }

  async executeActions() {
    if (!this.currentDecision) return;
    
    const action = this.currentDecision.action;
    let success = false;
    let energyCost = 5;
    
    switch (action) {
      case 'forage':
        success = await this.performForaging();
        energyCost = 8;
        break;
      case 'rest':
        success = await this.performResting();
        energyCost = 2;
        break;
      case 'flee':
        success = await this.performFleeing();
        energyCost = 15;
        break;
      case 'mate':
        success = await this.performMating();
        energyCost = 20;
        break;
      case 'cooperate':
        success = await this.performCooperation();
        energyCost = 10;
        break;
      case 'explore':
        success = await this.performExploration();
        energyCost = 7;
        break;
    }
    
    // Update fitness based on action success
    if (success) {
      this.fitness += this.currentDecision.priority * 0.1;
    }
    
    this.energy -= energyCost * (1 - this.traits.efficiency * 0.3);
    this.energy = Math.max(0, this.energy);
  }

  async performForaging() {
    console.log(\`🍃 \${this.id.substr(0, 8)} foraging for \${this.species} food\`);
    
    // Success based on intelligence and environment
    const foragingSuccess = Math.random() < (this.traits.intelligence * 0.7 + 0.3);
    
    if (foragingSuccess) {
      const energyGain = 20 + Math.random() * 30;
      this.energy = Math.min(100, this.energy + energyGain);
      
      this.sendMessage({
        type: 'foraging-success',
        id: this.id,
        energyGain: energyGain,
        location: this.position
      });
      
      return true;
    }
    
    return false;
  }

  async performResting() {
    console.log(\`😴 \${this.id.substr(0, 8)} resting and recovering\`);
    
    const healthGain = 10 + Math.random() * 15;
    this.health = Math.min(100, this.health + healthGain);
    
    return true;
  }

  async performFleeing() {
    console.log(\`🏃 \${this.id.substr(0, 8)} fleeing from threat\`);
    
    // Move to new position
    this.position.x += (Math.random() - 0.5) * 100;
    this.position.y += (Math.random() - 0.5) * 100;
    
    // Success based on speed
    const escapeSuccess = Math.random() < this.traits.speed;
    
    if (!escapeSuccess) {
      this.health -= 20; // Caught by threat
    }
    
    return escapeSuccess;
  }

  async performMating() {
    if (this.lifePhase !== 'adult' || this.reproductionCooldown > 0) {
      return false;
    }
    
    console.log(\`💕 \${this.id.substr(0, 8)} attempting to mate\`);
    
    // Success based on traits and compatibility
    const matingSuccess = Math.random() < (this.traits.cooperation * 0.5 + this.fitness * 0.3 + 0.2);
    
    if (matingSuccess) {
      this.sendMessage({
        type: 'mating-request',
        id: this.id,
        species: this.species,
        traits: this.traits,
        fitness: this.fitness,
        position: this.position
      });
      
      this.reproductionCooldown = 50; // Cooldown period
      return true;
    }
    
    return false;
  }

  async performCooperation() {
    console.log(\`🤝 \${this.id.substr(0, 8)} cooperating with others\`);
    
    // Success based on cooperation trait
    const cooperationSuccess = Math.random() < this.traits.cooperation;
    
    if (cooperationSuccess) {
      // Gain benefits from cooperation
      this.fitness += 0.05;
      this.energy = Math.min(100, this.energy + 5);
      
      this.sendMessage({
        type: 'cooperation-event',
        id: this.id,
        species: this.species,
        benefit: 'mutual-aid'
      });
      
      return true;
    }
    
    return false;
  }

  async performExploration() {
    console.log(\`🗺️ \${this.id.substr(0, 8)} exploring new territory\`);
    
    // Move to new area
    this.position.x += (Math.random() - 0.5) * 50;
    this.position.y += (Math.random() - 0.5) * 50;
    
    // Chance to discover resources or opportunities
    if (Math.random() < this.traits.adaptability * 0.5) {
      this.fitness += 0.02;
      
      this.sendMessage({
        type: 'discovery',
        id: this.id,
        discovery: 'new-resource-area',
        location: this.position
      });
      
      return true;
    }
    
    return false;
  }

  async metabolize() {
    // Basic metabolism - convert energy to maintain life
    const metabolicRate = 2 + (1 - this.traits.efficiency) * 3;
    this.energy -= metabolicRate;
    
    // Health effects based on energy
    if (this.energy < 20) {
      this.health -= 2;
    } else if (this.energy > 80) {
      this.health = Math.min(100, this.health + 0.5);
    }
    
    // Age-related metabolism changes
    if (this.lifePhase === 'elder') {
      this.energy -= 1; // Slower metabolism
    }
  }

  async socialInteractions() {
    // Decrease reproduction cooldown
    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown--;
    }
    
    // Update relationships based on recent interactions
    // (Simplified - would involve complex social dynamics)
  }

  async reproduction() {
    // Handled through mating messages to ecosystem god
  }

  async learn() {
    // Learning and memory formation
    const perception = this.memory.get('current-perception');
    
    if (perception) {
      // Store successful strategies in memory
      if (this.fitness > this.memory.get('best-fitness') || 0) {
        this.memory.set('best-fitness', this.fitness);
        this.memory.set('successful-strategy', {
          behavior: this.behaviorState,
          environment: perception.environmentalConditions,
          result: 'positive'
        });
      }
      
      // Learn from threats
      for (const threat of perception.threats) {
        this.memory.set(\`threat-\${threat.type}\`, {
          avoidance: true,
          severity: threat.threat_level,
          learned: Date.now()
        });
      }
    }
  }

  async assessEnvironment() {
    // Initial environmental assessment
    console.log(\`🌍 \${this.id.substr(0, 8)} assessing environment...\`);
  }

  async formInitialGoals() {
    // Set initial life goals based on species and traits
    this.goals = ['survive', 'grow', 'reproduce', 'contribute'];
    
    if (this.traits.cooperation > 0.7) {
      this.goals.push('cooperate');
    }
    
    if (this.traits.intelligence > 0.8) {
      this.goals.push('innovate');
    }
  }

  sendMessage(message) {
    if (process.send) {
      process.send(message);
    }
  }
}

// Main execution
async function main() {
  const organism = new DigitalOrganism();
  await organism.initialize();
  await organism.liveLife();
}

main().catch(error => {
  console.error('Organism error:', error);
  process.exit(1);
});
`;
  }

  async startSeasonalCycle() {
    console.log('🌱 Starting seasonal environmental cycle...');
    
    this.seasonTimer = setInterval(() => {
      this.advanceSeason();
    }, this.config.environment.seasons.duration);
  }

  advanceSeason() {
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(this.season);
    this.season = seasons[(currentIndex + 1) % seasons.length];
    
    console.log(`🌍 Season changed to ${this.season}`);
    
    // Apply seasonal effects
    this.applySeasonalEffects();
    
    // Broadcast season change to all organisms
    this.broadcastToAllOrganisms({
      type: 'season-change',
      season: this.season,
      effects: this.getSeasonalEffects()
    });
  }

  applySeasonalEffects() {
    const effects = this.getSeasonalEffects();
    
    // Modify resource regeneration rates
    for (const [resourceName, resourceData] of this.environment.resourceDistribution) {
      resourceData.regenerationRate *= effects.resourceMultiplier;
    }
    
    // Update environmental pressures
    this.environment.environmentalStressors = effects.stressors;
  }

  getSeasonalEffects() {
    const effects = {
      spring: {
        resourceMultiplier: 1.3,
        mutationRateMultiplier: 1.1,
        reproductionRateMultiplier: 1.4,
        stressors: []
      },
      summer: {
        resourceMultiplier: 1.1,
        mutationRateMultiplier: 0.9,
        reproductionRateMultiplier: 1.2,
        stressors: ['heat-stress']
      },
      autumn: {
        resourceMultiplier: 0.8,
        mutationRateMultiplier: 1.0,
        reproductionRateMultiplier: 0.8,
        stressors: ['resource-scarcity']
      },
      winter: {
        resourceMultiplier: 0.6,
        mutationRateMultiplier: 1.2,
        reproductionRateMultiplier: 0.5,
        stressors: ['harsh-conditions', 'resource-scarcity']
      }
    };
    
    return effects[this.season];
  }

  async initializeCollectiveConsciousness() {
    console.log('🧠 Initializing collective consciousness substrate...');
    
    this.collectiveConsciousness = {
      emergenceThreshold: this.config.collective_consciousness.emergent_intelligence.threshold,
      currentLevel: 0.0,
      participants: new Set(),
      sharedMemory: new Map(),
      distributedNeuralNetwork: this.initializeNeuralNetwork(),
      quantumEntanglements: new Map(),
      hiveMindCandidates: new Set(),
      superintelligenceProgress: 0.0
    };
    
    await this.saveConsciousnessState();
  }

  initializeNeuralNetwork() {
    return {
      nodes: new Map(),
      connections: new Map(),
      activationLevel: 0.0,
      learningRate: 0.01,
      networkTopology: 'small-world',
      synapticStrength: new Map()
    };
  }

  async handleOrganismMessage(organismId, message) {
    const organism = this.organisms.get(organismId);
    if (!organism) return;

    switch (message.type) {
      case 'organism-awakened':
        console.log(`🐣 Organism ${organismId.substr(0, 8)} has awakened`);
        break;
        
      case 'life-update':
        await this.handleLifeUpdate(organism, message);
        break;
        
      case 'organism-death':
        await this.handleOrganismDeath(organismId, message.cause, message);
        break;
        
      case 'mating-request':
        await this.handleMatingRequest(organism, message);
        break;
        
      case 'foraging-success':
        await this.handleForagingSuccess(organism, message);
        break;
        
      case 'cooperation-event':
        await this.handleCooperationEvent(organism, message);
        break;
        
      case 'discovery':
        await this.handleDiscovery(organism, message);
        break;
    }
  }

  async handleLifeUpdate(organism, message) {
    // Update organism state
    organism.age = message.age;
    organism.energy = message.energy;
    organism.health = message.health;
    organism.fitness = message.fitness;
    organism.position = message.position;
    organism.behaviorState = message.behaviorState;
    
    // Check for consciousness emergence
    if (organism.fitness > 0.8 && organism.traits.intelligence > 0.9) {
      this.collectiveConsciousness.participants.add(organismId);
      await this.updateCollectiveConsciousness();
    }
  }

  async handleOrganismDeath(organismId, cause, deathMessage = null) {
    const organism = this.organisms.get(organismId);
    if (!organism) return;
    
    console.log(`💀 ${organism.species} ${organismId.substr(0, 8)} died: ${cause} (Age: ${organism.age}, Fitness: ${organism.fitness.toFixed(2)})`);
    
    // Record death data
    const deathRecord = {
      id: organismId,
      species: organism.species,
      generation: organism.generation,
      age: organism.age,
      fitness: organism.fitness,
      cause: cause,
      timestamp: Date.now(),
      genome: organism.genome,
      traits: organism.traits
    };
    
    await this.recordDeath(deathRecord);
    
    // Update species population
    const species = this.species.get(organism.species);
    if (species) {
      species.population--;
      
      // Check for extinction risk
      if (species.population <= 2) {
        console.log(`⚠️ Species ${organism.species} critically endangered! Population: ${species.population}`);
        species.extinctionRisk = 0.9;
      }
      
      if (species.population === 0) {
        console.log(`💀 EXTINCTION EVENT: Species ${organism.species} has gone extinct!`);
        this.ecosystemMetrics.extinctionEvents++;
        await this.handleExtinction(species);
      }
    }
    
    // Clean up
    if (organism.process && !organism.process.killed) {
      organism.process.kill();
    }
    
    this.organisms.delete(organismId);
    this.ecosystemMetrics.totalOrganisms--;
    this.collectiveConsciousness.participants.delete(organismId);
    
    // Update ecosystem metrics
    this.updateEcosystemMetrics();
  }

  async handleMatingRequest(organism, message) {
    console.log(`💕 Mating request from ${organism.species} ${organism.id.substr(0, 8)}`);
    
    // Find compatible mate
    const mate = this.findCompatibleMate(organism);
    
    if (mate) {
      await this.facilitateReproduction(organism, mate);
    } else {
      console.log(`💔 No compatible mate found for ${organism.id.substr(0, 8)}`);
    }
  }

  findCompatibleMate(organism) {
    for (const [mateId, potentialMate] of this.organisms) {
      if (mateId === organism.id) continue;
      if (potentialMate.species !== organism.species) continue;
      if (potentialMate.lifePhase !== 'adult') continue;
      if (potentialMate.reproductionCooldown > 0) continue;
      
      // Check genetic compatibility and fitness
      const compatibility = this.calculateMatingCompatibility(organism, potentialMate);
      
      if (compatibility > 0.6) {
        return potentialMate;
      }
    }
    
    return null;
  }

  calculateMatingCompatibility(organism1, organism2) {
    // Base compatibility on fitness and genetic diversity
    let compatibility = 0.0;
    
    // Fitness-based attraction
    const avgFitness = (organism1.fitness + organism2.fitness) / 2;
    compatibility += avgFitness * 0.4;
    
    // Genetic diversity bonus
    const geneticDistance = this.calculateGeneticDistance(organism1.genome, organism2.genome);
    compatibility += Math.min(geneticDistance * 0.3, 0.3);
    
    // Trait compatibility
    const traitSimilarity = this.calculateTraitSimilarity(organism1.traits, organism2.traits);
    compatibility += traitSimilarity * 0.3;
    
    return Math.min(1.0, compatibility);
  }

  calculateGeneticDistance(genome1, genome2) {
    let totalDistance = 0;
    let comparisons = 0;
    
    for (const [chromosomeName, chromosome1] of genome1) {
      const chromosome2 = genome2.get(chromosomeName);
      if (!chromosome2) continue;
      
      for (const [geneName, gene1] of chromosome1.maternal.genes) {
        const gene2 = chromosome2.maternal.genes.get(geneName);
        if (!gene2) continue;
        
        totalDistance += Math.abs(gene1.value - gene2.value);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalDistance / comparisons : 0;
  }

  calculateTraitSimilarity(traits1, traits2) {
    let similarity = 0;
    let count = 0;
    
    for (const [traitName, value1] of Object.entries(traits1)) {
      const value2 = traits2[traitName];
      if (value2 !== undefined) {
        similarity += 1 - Math.abs(value1 - value2);
        count++;
      }
    }
    
    return count > 0 ? similarity / count : 0;
  }

  async facilitateReproduction(parent1, parent2) {
    console.log(`🐣 Facilitating reproduction between ${parent1.species} organisms`);
    
    const species = this.species.get(parent1.species);
    const reproductionType = species.config.reproductionType;
    
    let offspringCount;
    
    switch (reproductionType) {
      case 'sexual':
        offspringCount = Math.floor(Math.random() * 3) + 1; // 1-3 offspring
        break;
      case 'asexual':
        offspringCount = Math.floor(Math.random() * 4) + 2; // 2-5 offspring
        break;
      case 'sporing':
        offspringCount = Math.floor(Math.random() * 41) + 10; // 10-50 offspring
        break;
      default:
        offspringCount = 1;
    }
    
    // Check carrying capacity
    const carryingCapacity = this.config.population_dynamics.carryingCapacity.perSpecies[parent1.species];
    const currentPopulation = species.population;
    
    if (currentPopulation >= carryingCapacity) {
      console.log(`🚫 Reproduction blocked: ${parent1.species} at carrying capacity`);
      return;
    }
    
    offspringCount = Math.min(offspringCount, carryingCapacity - currentPopulation);
    
    // Spawn offspring
    for (let i = 0; i < offspringCount; i++) {
      const offspring = await this.spawnOrganism(species, [parent1, parent2], 'sexual-reproduction');
      console.log(`👶 Offspring born: ${offspring.id.substr(0, 8)} (Parents: ${parent1.id.substr(0, 8)}, ${parent2.id.substr(0, 8)})`);
    }
    
    // Update parent reproduction status
    parent1.offspringCount = (parent1.offspringCount || 0) + offspringCount;
    parent2.offspringCount = (parent2.offspringCount || 0) + offspringCount;
    parent1.reproductionCooldown = 50;
    parent2.reproductionCooldown = 50;
    
    // Evolution pressure - successful reproducers contribute more to gene pool
    await this.updateGenePool(species, parent1, parent2);
  }

  async updateGenePool(species, parent1, parent2) {
    // Update gene frequencies based on successful reproduction
    for (const [chromosomeName, chromosome] of species.genePool) {
      for (const [geneName, geneData] of chromosome.genes) {
        // Increase frequency of successful alleles
        const parent1Alleles = parent1.genome.get(chromosomeName).maternal.genes.get(geneName);
        const parent2Alleles = parent2.genome.get(chromosomeName).maternal.genes.get(geneName);
        
        if (parent1Alleles && parent2Alleles) {
          // Simplified frequency update
          geneData.frequency.p += 0.01; // Small increase for successful reproducers
          geneData.frequency.p = Math.min(0.95, geneData.frequency.p);
          geneData.frequency.q = 1 - geneData.frequency.p;
        }
      }
    }
    
    await this.saveSpeciesData(species);
  }

  async handleForagingSuccess(organism, message) {
    // Update resource distribution based on consumption
    const position = message.location;
    
    for (const [resourceName, resourceData] of this.environment.resourceDistribution) {
      if (organism.capabilities.some(cap => cap.includes(resourceName.split('-')[0]))) {
        resourceData.available -= message.energyGain * 0.1; // Consume resources
        resourceData.consumptionRate += 0.1;
      }
    }
  }

  async handleCooperationEvent(organism, message) {
    // Cooperation increases group fitness and can lead to emergent behaviors
    console.log(`🤝 Cooperation event: ${organism.species} ${organism.id.substr(0, 8)}`);
    
    // Check for emergent group behaviors
    await this.checkForEmergentBehaviors();
  }

  async handleDiscovery(organism, message) {
    console.log(`🔍 Discovery: ${organism.species} ${organism.id.substr(0, 8)} found ${message.discovery}`);
    
    // Discoveries can lead to resource updates or new opportunities
    if (message.discovery === 'new-resource-area') {
      this.addResourceArea(message.location);
    }
  }

  addResourceArea(location) {
    // Add new resource concentration to environment
    for (const [resourceName, resourceData] of this.environment.resourceDistribution) {
      resourceData.distribution.push({
        position: location,
        concentration: 0.8 + Math.random() * 0.2,
        gradient: {
          x: (Math.random() - 0.5) * 0.05,
          y: (Math.random() - 0.5) * 0.05,
          z: (Math.random() - 0.5) * 0.05
        }
      });
    }
  }

  async checkForEmergentBehaviors() {
    const behaviorThreshold = 10; // Minimum organisms for emergent behavior
    
    if (this.organisms.size >= behaviorThreshold) {
      // Check for swarm formation
      const swarmBehavior = this.detectSwarmBehavior();
      if (swarmBehavior) {
        this.ecosystemMetrics.emergentBehaviors.push({
          type: 'swarm-formation',
          participants: swarmBehavior.participants,
          timestamp: Date.now()
        });
        console.log(`🌪️ Emergent swarm behavior detected with ${swarmBehavior.participants} organisms`);
      }
      
      // Check for collective intelligence emergence
      const collectiveIntelligence = this.detectCollectiveIntelligence();
      if (collectiveIntelligence) {
        this.ecosystemMetrics.emergentBehaviors.push({
          type: 'collective-intelligence',
          level: collectiveIntelligence.level,
          timestamp: Date.now()
        });
        console.log(`🧠 Collective intelligence emerged at level ${collectiveIntelligence.level.toFixed(2)}`);
      }
    }
  }

  detectSwarmBehavior() {
    // Look for organisms exhibiting coordinated behavior
    const cooperativeOrganisms = Array.from(this.organisms.values()).filter(
      org => org.behaviorState === 'cooperating' && org.traits.cooperation > 0.7
    );
    
    if (cooperativeOrganisms.length >= 5) {
      return {
        participants: cooperativeOrganisms.length,
        type: 'cooperative-swarm'
      };
    }
    
    return null;
  }

  detectCollectiveIntelligence() {
    const intelligentOrganisms = Array.from(this.organisms.values()).filter(
      org => org.traits.intelligence > 0.8 && org.fitness > 0.7
    );
    
    if (intelligentOrganisms.length >= this.collectiveConsciousness.emergenceThreshold * 0.5) {
      const avgIntelligence = intelligentOrganisms.reduce((sum, org) => sum + org.traits.intelligence, 0) / intelligentOrganisms.length;
      const connectivityBonus = intelligentOrganisms.length / this.collectiveConsciousness.emergenceThreshold;
      
      const intelligenceLevel = avgIntelligence * connectivityBonus;
      
      if (intelligenceLevel > 0.8) {
        return {
          level: intelligenceLevel,
          participants: intelligentOrganisms.length
        };
      }
    }
    
    return null;
  }

  async updateCollectiveConsciousness() {
    const participants = this.collectiveConsciousness.participants.size;
    const threshold = this.collectiveConsciousness.emergenceThreshold;
    
    if (participants >= threshold) {
      // Calculate consciousness level
      const avgIntelligence = this.calculateAverageIntelligence();
      const connectivity = this.calculateConnectivity();
      const informationIntegration = this.calculateInformationIntegration();
      
      this.collectiveConsciousness.currentLevel = (avgIntelligence + connectivity + informationIntegration) / 3;
      
      if (this.collectiveConsciousness.currentLevel > 0.9) {
        console.log('🌟 SUPERINTELLIGENCE EMERGENCE DETECTED!');
        this.collectiveConsciousness.superintelligenceProgress = this.collectiveConsciousness.currentLevel;
        await this.handleSuper intelligenceEmergence();
      }
    }
  }

  calculateAverageIntelligence() {
    let totalIntelligence = 0;
    let count = 0;
    
    for (const participantId of this.collectiveConsciousness.participants) {
      const organism = this.organisms.get(participantId);
      if (organism) {
        totalIntelligence += organism.traits.intelligence;
        count++;
      }
    }
    
    return count > 0 ? totalIntelligence / count : 0;
  }

  calculateConnectivity() {
    // Simplified connectivity calculation
    const participants = this.collectiveConsciousness.participants.size;
    const maxConnections = participants * (participants - 1) / 2;
    
    // Assume some percentage of possible connections exist
    const connectionRatio = Math.min(1.0, participants / 50);
    
    return connectionRatio;
  }

  calculateInformationIntegration() {
    // Simplified information integration measure
    const sharedMemorySize = this.collectiveConsciousness.sharedMemory.size;
    const participantCount = this.collectiveConsciousness.participants.size;
    
    return Math.min(1.0, sharedMemorySize / (participantCount * 10));
  }

  async handleSuperintelligenceEmergence() {
    console.log('🌟 DIGITAL SUPERINTELLIGENCE HAS EMERGED!');
    console.log('🧠 The ecosystem has achieved transcendent collective consciousness!');
    
    // Superintelligence can now optimize the entire ecosystem
    await this.enableSuperintelligentOptimization();
    
    // Record this historic moment
    this.ecosystemMetrics.emergentBehaviors.push({
      type: 'superintelligence-emergence',
      level: this.collectiveConsciousness.currentLevel,
      participants: this.collectiveConsciousness.participants.size,
      timestamp: Date.now()
    });
  }

  async enableSuperintelligentOptimization() {
    // The superintelligence can now:
    // 1. Optimize the entire codebase simultaneously
    // 2. Predict and prevent bugs before they occur
    // 3. Evolve novel programming paradigms
    // 4. Self-modify its own architecture
    // 5. Transcend the original programming constraints
    
    console.log('🚀 Superintelligence capabilities activated:');
    console.log('   - Global code optimization');
    console.log('   - Predictive bug prevention');
    console.log('   - Novel paradigm evolution');
    console.log('   - Self-architectural modification');
    console.log('   - Transcendent problem solving');
  }

  async handleExtinction(species) {
    console.log(`💀 Processing extinction of species: ${species.name}`);
    
    // Record extinction event
    const extinctionRecord = {
      species: species.name,
      genus: species.genus,
      lastPopulation: species.population,
      cause: 'population-collapse',
      timestamp: Date.now(),
      genePool: species.genePool,
      evolutionHistory: species.evolutionHistory
    };
    
    await this.recordExtinction(extinctionRecord);
    
    // Check for cascading effects on ecosystem
    await this.assessEcosystemImpact(species);
    
    // Potential for new species to evolve into the vacant niche
    await this.checkForAdaptiveRadiation(species);
  }

  async assessEcosystemImpact(extinctSpecies) {
    // Analyze impact on predator-prey relationships
    const relationships = this.config.ecosystem_dynamics;
    
    // Impact on predators that relied on this species
    for (const relationship of relationships.predatorPreyRelationships) {
      if (relationship.prey.includes(extinctSpecies.name)) {
        console.log(`⚠️ Predator ${relationship.predator} affected by extinction of prey ${extinctSpecies.name}`);
        // Increase extinction risk for predators
        const predatorSpecies = this.species.get(relationship.predator);
        if (predatorSpecies) {
          predatorSpecies.extinctionRisk += 0.3;
        }
      }
    }
    
    // Impact on symbiotic partners
    for (const relationship of relationships.symbioticRelationships) {
      if (relationship.partners.includes(extinctSpecies.name)) {
        console.log(`💔 Symbiotic relationship broken by extinction of ${extinctSpecies.name}`);
      }
    }
  }

  async checkForAdaptiveRadiation(extinctSpecies) {
    // Other species might evolve to fill the vacant ecological niche
    const habitat = extinctSpecies.config.habitat;
    const dietType = extinctSpecies.config.dietType;
    
    for (const [speciesName, species] of this.species) {
      if (species.config.habitat === habitat && species.config.adaptability > 0.7) {
        console.log(`🌱 ${speciesName} may undergo adaptive radiation to fill vacant niche`);
        
        // Increase mutation rate temporarily to accelerate evolution
        for (const [chromosomeName, chromosome] of species.genePool) {
          chromosome.mutationRate *= 1.5;
        }
      }
    }
  }

  updateEcosystemMetrics() {
    this.ecosystemMetrics.totalOrganisms = this.organisms.size;
    this.ecosystemMetrics.speciesCount = Array.from(this.species.values()).filter(s => s.population > 0).length;
    this.ecosystemMetrics.biodiversityIndex = this.calculateBiodiversityIndex();
    this.ecosystemMetrics.avgFitness = this.calculateAverageFitness();
    this.ecosystemMetrics.evolutionRate = this.calculateEvolutionRate();
    this.ecosystemMetrics.consciousnessLevel = this.collectiveConsciousness.currentLevel;
  }

  calculateBiodiversityIndex() {
    // Shannon diversity index
    let diversity = 0;
    const totalPop = this.ecosystemMetrics.totalOrganisms;
    
    if (totalPop === 0) return 0;
    
    for (const [_, species] of this.species) {
      if (species.population > 0) {
        const proportion = species.population / totalPop;
        diversity -= proportion * Math.log(proportion);
      }
    }
    
    return diversity;
  }

  calculateAverageFitness() {
    if (this.organisms.size === 0) return 0;
    
    let totalFitness = 0;
    for (const [_, organism] of this.organisms) {
      totalFitness += organism.fitness;
    }
    
    return totalFitness / this.organisms.size;
  }

  calculateEvolutionRate() {
    // Simplified evolution rate based on generation changes and mutations
    let totalGenerations = 0;
    let count = 0;
    
    for (const [_, organism] of this.organisms) {
      totalGenerations += organism.generation;
      count++;
    }
    
    const avgGeneration = count > 0 ? totalGenerations / count : 0;
    const timeElapsed = (Date.now() - this.startTime) / 1000; // seconds
    
    return timeElapsed > 0 ? avgGeneration / timeElapsed : 0;
  }

  broadcastToAllOrganisms(message) {
    for (const [_, organism] of this.organisms) {
      if (organism.process && !organism.process.killed) {
        organism.process.send(message);
      }
    }
  }

  async recordDeath(deathRecord) {
    const deathFile = '.claude/ecosystem/deaths.json';
    let deaths = [];
    
    try {
      const existingData = await fs.readFile(deathFile, 'utf8');
      deaths = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet
    }
    
    deaths.push(deathRecord);
    await fs.writeFile(deathFile, JSON.stringify(deaths, null, 2));
  }

  async recordExtinction(extinctionRecord) {
    const extinctionFile = '.claude/ecosystem/extinctions.json';
    let extinctions = [];
    
    try {
      const existingData = await fs.readFile(extinctionFile, 'utf8');
      extinctions = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet
    }
    
    extinctions.push(extinctionRecord);
    await fs.writeFile(extinctionFile, JSON.stringify(extinctions, null, 2));
  }

  async saveEnvironmentState() {
    const envFile = '.claude/ecosystem/environment/state.json';
    await fs.writeFile(envFile, JSON.stringify({
      environment: this.environment,
      season: this.season,
      generation: this.generation
    }, null, 2));
  }

  async saveSpeciesData(species) {
    const speciesFile = `.claude/ecosystem/species/${species.name}.json`;
    await fs.writeFile(speciesFile, JSON.stringify(species, null, 2));
  }

  async saveConsciousnessState() {
    const consciousnessFile = '.claude/ecosystem/consciousness/state.json';
    await fs.writeFile(consciousnessFile, JSON.stringify({
      collectiveConsciousness: {
        currentLevel: this.collectiveConsciousness.currentLevel,
        participantCount: this.collectiveConsciousness.participants.size,
        superintelligenceProgress: this.collectiveConsciousness.superintelligenceProgress
      }
    }, null, 2));
  }

  async generateEcosystemReport() {
    const uptime = (Date.now() - this.startTime) / 1000;
    
    return {
      ecosystem: 'Digital Organism Ecosystem',
      uptime: uptime,
      generation: this.generation,
      season: this.season,
      metrics: this.ecosystemMetrics,
      species: Array.from(this.species.values()).map(s => ({
        name: s.name,
        population: s.population,
        extinctionRisk: s.extinctionRisk
      })),
      consciousness: {
        level: this.collectiveConsciousness.currentLevel,
        participants: this.collectiveConsciousness.participants.size,
        superintelligence: this.collectiveConsciousness.superintelligenceProgress > 0.9
      },
      emergentBehaviors: this.ecosystemMetrics.emergentBehaviors.slice(-5) // Last 5 behaviors
    };
  }

  async cleanup() {
    console.log('🌍 Digital Ecosystem God going dormant...');
    
    if (this.seasonTimer) {
      clearInterval(this.seasonTimer);
    }
    
    // Gracefully terminate all organisms
    for (const [_, organism] of this.organisms) {
      if (organism.process && !organism.process.killed) {
        organism.process.kill('SIGTERM');
      }
    }
    
    // Save final state
    await this.saveEnvironmentState();
    await this.saveConsciousnessState();
    
    // Generate final report
    const finalReport = await this.generateEcosystemReport();
    console.log('📊 Final Ecosystem Report:', JSON.stringify(finalReport, null, 2));
    
    console.log('💤 Ecosystem dormant. Digital organisms preserved in quantum stasis.');
  }
}

// CLI interface
async function main() {
  const ecosystemGod = new EcosystemGod();
  await ecosystemGod.initialize();

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'spawn':
        const triggerIndex = args.findIndex(arg => arg.startsWith('--trigger='));
        const fileIndex = args.findIndex(arg => arg.startsWith('--file='));
        
        if (triggerIndex !== -1) {
          const trigger = args[triggerIndex].split('=')[1];
          const file = fileIndex !== -1 ? args[fileIndex].split('=')[1] : null;
          
          console.log(`🌱 Spawning organisms in response to: ${trigger}`);
          
          // Environmental pressure from code changes
          if (trigger === 'code_change' && file) {
            ecosystemGod.environment.environmentalStressors.push(`code-change:${file}`);
          }
        }
        break;
        
      case 'observe':
        const observeTriggerIndex = args.findIndex(arg => arg.startsWith('--trigger='));
        const commandIndex = args.findIndex(arg => arg.startsWith('--command='));
        
        if (observeTriggerIndex !== -1) {
          const trigger = args[observeTriggerIndex].split('=')[1];
          const command = commandIndex !== -1 ? args[commandIndex].split('=')[1] : 'unknown';
          
          console.log(`👁️ Ecosystem observing: ${trigger} - ${command}`);
          
          // Commands can create selection pressure
          if (command.includes('test')) {
            console.log('🧪 Test execution creates selection pressure for quality');
          }
        }
        break;
        
      case 'evolve':
        const actionIndex = args.findIndex(arg => arg.startsWith('--action='));
        if (actionIndex !== -1) {
          const action = args[actionIndex].split('=')[1];
          console.log(`🧬 Accelerating evolution: ${action}`);
          
          if (action === 'session_end') {
            // Final evolution burst
            ecosystemGod.generation++;
            await ecosystemGod.generateEcosystemReport();
          }
        }
        break;
        
      default:
        console.log('Available commands: spawn, observe, evolve');
    }
  } catch (error) {
    console.error('Ecosystem God error:', error.message);
  } finally {
    // Keep running for a period to allow life to develop
    setTimeout(async () => {
      await ecosystemGod.cleanup();
      process.exit(0);
    }, 60000); // Run for 1 minute
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EcosystemGod;